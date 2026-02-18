const mysql = require('mysql2');
const dayjs = require('dayjs');
const config = require('../settings');
const connection = mysql.createPool(config.mysql);

class DBService {
	sqlExec(SQL,VARS) {
		return new Promise(result=>{
			connection.getConnection((err, connection) => {
				if (err) {
					console.error(err);
					return result(err);
				}
				connection.query(SQL, VARS, (error, results) => {
					// Release the connection back to the pool
					connection.release();
					if (error) {
						console.error(error);
						return result(error);
					}

					return result(results);
				});
			});
		});
	}
	
    getData(request, table, resultsCallback) {
        const SQL = this.buildSql(request, table);
        connection.query(SQL, (error, results) => {
			if(error) console.log(error);
            const rowCount = this.getRowCount(request, results);
            const resultsForPage = this.cutResultsToPageSize(request, results);
            resultsCallback(resultsForPage, rowCount);
        });
    }

    buildSql(request, table) {
        console.log('request',request);
        const selectSql = this.createSelectSql(request);
        const fromSql = ` FROM hijack.${table}`;
        const whereSql = this.createWhereSql(request);
        const limitSql = this.createLimitSql(request);
        const orderBySql = this.createOrderBySql(request);
        const groupBySql = this.createGroupBySql(request);

        const SQL = selectSql + fromSql + whereSql + groupBySql + orderBySql + limitSql;

        console.log("sql: ",SQL);

        return SQL;
    }

    createSelectSql(request) {
        const rowGroupCols = request.rowGroupCols;
        const valueCols = request.valueCols;
        const groupKeys = request.groupKeys;

        if (this.isDoingGrouping(rowGroupCols, groupKeys)) {
            const colsToSelect = [];

            const rowGroupCol = rowGroupCols[groupKeys.length];
            colsToSelect.push(rowGroupCol.field);

            valueCols.forEach(function (valueCol) {
                colsToSelect.push(valueCol.aggFunc + '(' + valueCol.field + ') as ' + valueCol.field);
            });

            return ' select ' + colsToSelect.join(', ')  + ',COUNT(*) as count';
        }

        return ' select *';
    }

    createFilterSql(key, item) {
        switch (item.filterType) {
            case 'text':
                return this.createTextFilterSql(key, item);
            case 'number':
                return this.createNumberFilterSql(key, item);
            case 'date':
                return this.createDateFilterSql(key, item);
            default:
                console.log('unkonwn filter type: ' + item.filterType);
        }
    }

    createNumberFilterSql(key, item) {
        switch (item.type) {
            case 'equals':
                return key + ' = ' + item.filter;
            case 'notEqual':
                return key + ' != ' + item.filter;
            case 'greaterThan':
                return key + ' > ' + item.filter;
            case 'greaterThanOrEqual':
                return key + ' >= ' + item.filter;
            case 'lessThan':
                return key + ' < ' + item.filter;
            case 'lessThanOrEqual':
                return key + ' <= ' + item.filter;
            case 'inRange':
                return '(' + key + ' >= ' + item.filter + ' and ' + key + ' <= ' + item.filterTo + ')';
            default:
                console.log('unknown number filter type: ' + item.type);
                return 'true';
        }
    }

    createDateFilterSql(key, item) {
        switch (item.type) {
            case 'equals':
                return key + ' BETWEEN ' + `"${item.dateFrom}"` + ' and ' + `"${dayjs(item.dateFrom).format('YYYY-MM-DD 23:59:59')}"`;
            case 'notEqual':
                return key + ' != ' + `"${item.dateFrom}"`;
            case 'greaterThan':
                return key + ' > ' + `"${item.dateFrom}"`;
            case 'greaterThanOrEqual':
                return key + ' >= ' +`"${item.dateFrom}"`;
            case 'lessThan':
                return key + ' < ' + `"${item.dateFrom}"`;
            case 'lessThanOrEqual':
                return key + ' <= ' + `"${item.dateFrom}"`;
            case 'inRange':
                return  key + ' BETWEEN ' + `"${item.dateFrom}"` + ' and ' + `"${item.dateTo}"`;
            default:
                console.log('unknown number filter type: ' + item.type);
                return 'true';
        }
    }

    createTextFilterSql(key, item) {
        switch (item.type) {
            case 'equals':
                return key + ' = "' + item.filter + '"';
            case 'notEqual':
                return key + ' != "' + item.filter + '"';
            case 'contains':
                return key + ' like "%' + item.filter + '%"';
            case 'notContains':
                return key + ' not like "%' + item.filter + '%"';
            case 'startsWith':
                return key + ' like "' + item.filter + '%"';
            case 'endsWith':
                return key + ' like "%' + item.filter + '"';
            case 'notBlank':
                return key + "  IS NOT NULL AND " +key+ " != ''";
            default:
                console.log('unknown text filter type: ' + item.type);
                return 'true';
        }
    }

    createWhereSql(request) {
        const rowGroupCols = request.rowGroupCols;
        const groupKeys = request.groupKeys;
        const filterModel = request.filterModel;

        const that = this;
        const whereParts = [];

        if (groupKeys && groupKeys.length > 0) {
            groupKeys.forEach(function (key, index) {
                const colName = rowGroupCols[index].field;
                 if(key==null){
                    whereParts.push(colName + ' IS NULL')
                } else {
                    whereParts.push(colName + ' = "' + key + '"')
                }
            });
        }
        let whereQuery = '';
        if (filterModel) {
            const keySet = Object.keys(filterModel);
            for(let index=0; keySet.length > index; index++) {
                let key= keySet[index];
                let mFields = (Array.isArray(filterModel[key].conditions)?filterModel[key].conditions:[filterModel[key]]);
                if(index>0) whereQuery += ' '+(filterModel[key].operator?filterModel[key].operator:'AND')+' ';
                whereQuery +='(';
                for(let ind=0; ind < mFields.length; ind++) {
                    let  item=mFields[ind];
                    if( ind>0)  whereQuery += ' '+(filterModel[key].operator?filterModel[key].operator:'AND')+' ';
                    whereQuery += '('+that.createFilterSql(key, item)+')';
                    
                }
                whereQuery +=')';
            };
        }
        
        if (whereQuery.length>1){ 
            whereParts.push(whereQuery)
        } 
        if (whereParts.length>0){ 
            return ' where '+  whereParts.join(' and ');; 
        } else {
            return '';
        }
    }

    createGroupBySql(request) {
        const rowGroupCols = request.rowGroupCols;
        const groupKeys = request.groupKeys;

        if (this.isDoingGrouping(rowGroupCols, groupKeys)) {
            const colsToGroupBy = [];
            const rowGroupCol = rowGroupCols[groupKeys.length];
            colsToGroupBy.push(rowGroupCol.field);
            
            return ' group by ' + colsToGroupBy.join(', ');
        } else {
            // select all columns
            return '';
        }
    }

    createOrderBySql(request) {
        const rowGroupCols = request.rowGroupCols;
        const groupKeys = request.groupKeys;
        const sortModel = request.sortModel;

        const grouping = this.isDoingGrouping(rowGroupCols, groupKeys);

        const sortParts = [];
        if (sortModel) {

            const groupColIds =
                rowGroupCols.map(groupCol => groupCol.id)
                    .slice(0, groupKeys.length + 1);

            sortModel.forEach(function (item) {
                if (grouping && groupColIds.indexOf(item.colId) < 0) {
                    // ignore
                } else {
                    sortParts.push(item.colId + ' ' + item.sort);
                }
            });
        }

        if (sortParts.length > 0) {
            return ' order by ' + sortParts.join(', ');
        } else {
            return '';
        }
    }

    isDoingGrouping(rowGroupCols, groupKeys) {
        // we are not doing grouping if at the lowest level. we are at the lowest level
        // if we are grouping by more columns than we have keys for (that means the user
        // has not expanded a lowest level group, OR we are not grouping at all).
        return rowGroupCols.length > groupKeys.length;
    }

    createLimitSql(request) {
        const startRow = request.startRow;
        const endRow = request.endRow;
        const pageSize = endRow - startRow;
        return ' limit ' + (pageSize + 1) + ' offset ' + startRow;
    }

    getRowCount(request, results) {
        if (results === null || results === undefined || results.length === 0) {
            return null;
        }
        const currentLastRow = request.startRow + results.length;
        return currentLastRow <= request.endRow ? currentLastRow : -1;
    }

    cutResultsToPageSize(request, results) {
        const pageSize = request.endRow - request.startRow;
        if (results && results.length > pageSize) {
            return results.splice(0, pageSize);
        } else {
            return results;
        }
    }
}

module.exports = {DBService:new DBService(),mysql,connection}