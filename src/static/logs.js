let gridApi;
const gridOptions = {
    defaultColDef: {
        flex: 1,
        minWidth: 90,
        menuTabs: ['filterMenuTab'],
        filter: true,
        floatingFilter: true,
    },
    columnTypes: {
        number: { filter: 'agNumberColumnFilter' },
    },
    // use the server-side row model
    rowModelType: 'serverSide',
    autoGroupColumnDef:{
        minWidth: 200,
        filter: 'agGroupColumnFilter',
    },
    rowGroupPanelShow: 'always',
    groupDisplayType: 'multipleColumns',
    // Column Definitions: Defines & controls grid columns.
    columnDefs: [
        {
           // headerName: 'URL',
           // field: 'url', filter: 'agTextColumnFilter',
            headerName: 'Domain',
            field: 'domain', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
                maxNumConditions: 1,
            },
            rowGroup: true,
            enableRowGroup: true,
            hide: true,
            filter: 'agTextColumnFilter',
            editable: true, 
        },
        {
            headerName: 'URL',
            field: 'url', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
            enableRowGroup: true,
            filter: 'agTextColumnFilter',
            editable: true, 
        },
        {
            headerName: 'IP',
            field: 'ip', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
            enableRowGroup: true,
            filter: 'agTextColumnFilter',
            editable: true, 
        },
        {
            headerName: 'Country',
            field: 'country', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
            enableRowGroup: true,
            filter: 'agTextColumnFilter',
        },
        {
            field: 'dump', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
            editable: true, 
        },
        {
            headerName: 'UA',
            field: 'ua', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
            enableRowGroup: true,
            filter: 'agTextColumnFilter',
            editable: true, 
        },
        {
            field: 'date', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
            enableRowGroup: true,
            filter: 'agDateColumnFilter',
            valueFormatter: dateFormatter

        },
    ],
    // enable pagination
    pagination: true,
    // 20 rows per page (default is 100)
    paginationPageSize: 50,
    // fetch 10 rows per block as page size is 10 (default is 100)
    cacheBlockSize: 50,

    getChildCount: (data) => {
        return data ? data.count : undefined;
    },

    onStoreRefreshed: (event) => {
        console.log('Refresh finished for store with route:', event.route);
    },
    enableCellChangeFlash: true,
    suppressAggFuncInHeader: true,
};



function dateFormatter(params) {
    if (params.value) {
        return new Date(params.value).toLocaleString();
    }
}

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function () {
    console.log('page loaded');
    var gridDiv = document.querySelector('#myGrid');
    gridApi = agGrid.createGrid(gridDiv, gridOptions);
onGridReady(gridApi);
    const datasource = getServerSideDatasource();
    gridApi.setGridOption('serverSideDatasource', datasource);
    setInterval(getTotalCountFromServer,3000,gridApi);
});

let requestParams = null
function getServerSideDatasource() {
    return {
        getRows: (params) => {
            requestParams = params
            // console.log('[Datasource] - rows requested by grid: ', params.request);
            fetch('/logs/data', {
                method: 'post',
                body: JSON.stringify(params.request),
                headers: { "Content-Type": "application/json; charset=utf-8" }
            })
                .then((response) => response.json())
                .then(function (res) {
                    if (res.success) {
                        // call the success callback
                        params.success({
                            rowData: res.rows,
                            rowCount: res.lastRow,
                        });
                    } else {
                        // inform the grid request failed
                        params.fail();
                    }
                });

        },
    };
}
document.getElementById('refresh-button').addEventListener('click', function () {
    getServerSideDatasource().getRows(requestParams)
})



function onGridReady(gridApi) {
  gridApi.sizeColumnsToFit();
  /*
  // get filter instance
  var filterComponentOwner = gridApi.getFilterInstance("owner");
  // OR set filter model and update
  filterComponentOwner.setModel({
    //"filterType": "text",
    //"type": "equals",
    //"filter": "Jose"
    "filterType": "set",
    "values": ["Jose"]
  });
  */
  var filterComponent = gridApi.getFilterInstance("date");
  // OR set filter model and update
  filterComponent.setModel({
    "dateFrom": (new Date().toJSON().replace(/T.*/,''))+" 00:00:00",
    "dateTo": null,
    "filterType": "date",
    "type": "equals"
  });
  //filterComponent.onFloatingFilterChanged()
  gridApi.onFilterChanged();
}

async function getTotalCountFromServer(gridApi){
    
    const response = await fetch('/logs/count',
    {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify({filterModel:gridApi.getFilterModel()})
    });
    const values = await response.json();
    document.getElementById('total-count').innerHTML=`<h6 class="title">Total Count:<b> ${values}</b></h6>`;
    if(document.getElementById('total')) document.getElementById('total').remove();
    document.getElementsByClassName("ag-paging-panel")[0].innerHTML += ('<div id="total" style="left:0;position: fixed;">Total Count:<b>'+values+'</b></div>');
}
