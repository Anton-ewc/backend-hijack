let gridApi;
const gridOptions = {
    suppressClickEdit: true,
    onCellClicked(params) {
        // Handle click event for action cells
        if (params.column.colId === "action" && params.event.target.dataset.action) {
            let action = params.event.target.dataset.action;

            if (action === "edit") {
                updateRow(params.data)
            }

            if (action === "delete") {
                if (confirm("Are you sure?") == true) {
                    fetch('/delete/' + params.data.id, {
                        method: 'DELETE',
                    })
                        .then(res => res.json())
                        .then(res => alert(`${field} was deleted`))
                        ;
                    location.reload()
                }
            }
        }
    },
    defaultColDef: {
        flex: 1,
        minWidth: 90,
        menuTabs: ['filterMenuTab'],
    },
    columnTypes: {
        number: { filter: 'agNumberColumnFilter' },
    },
    // use the server-side row model
    rowModelType: 'serverSide',

    // Column Definitions: Defines & controls grid columns.
    columnDefs: [
        {
            headerName: 'ref URL',
            field: 'url', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
                maxNumConditions: 1,
            },
            editable: true,
        },
        {
            headerName: 'URL Redirect',
            field: 'url_redirect', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
            editable: true,
        },
        {
            headerName: 'Country',
            field: 'country', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
        },
        {
            headerName: 'Redirect %',
            field: 'redirect_percent', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
        },
        {
            headerName: 'ColdDown sec',
            field: 'cache_period', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
        },
        {
            headerName: 'Start Time',
            field: 'start_time', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
            valueFormatter: timeFormatter
        },
        {
            headerName: 'End Time',
            field: 'end_time', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
            valueFormatter: timeFormatter
        },
        {
            headerName: 'Days',
            field: 'days', filter: 'agTextColumnFilter',
            filterParams: {
                buttons: ['reset'],
                debounceMs: 1000,
            },
        },
        {
            headerName: "Action",
            minWidth: 150,
            cellRenderer: actionCellRenderer,
            editable: false,
            colId: "action"
        },
    ],

    components: {
        btnCellRenderer: BtnCellRenderer,
    },
    // enable pagination
    pagination: true,
    // 20 rows per page (default is 100)
    paginationPageSize: 50,
    // fetch 10 rows per block as page size is 10 (default is 100)
    cacheBlockSize: 50,

    // update
    enableCellChangeFlash: true,
    rowSelection: 'single',

};

function updateRow(data) {
    const id = data.id
    // remove button
    let createBtn = document.getElementById("config-submit")
    createBtn.classList.add("hidden");
    // add button
    const button = document.getElementById("edit-config");
    button.classList.remove("hidden");
    $('.countrypicker option:selected').removeAttr('selected');
    $('.countrypicker').trigger('change');
    const start_time = document.getElementById("start_time")
    start_time.defaultValue = data.start_time
    const end_time = document.getElementById("end_time")
    end_time.defaultValue = data.end_time
    const redirect_percent = document.getElementById("redirect_percent")
    redirect_percent.defaultValue = data.redirect_percent
    const url = document.getElementById("url")
    url.defaultValue = data.url
    const url_redirect = document.getElementById("url_redirect")
    url_redirect.defaultValue = data.url_redirect
    
    document.getElementById("colddown").defaultValue = data.cache_period||0;

    const days = (data.days||'').split(",")
    const sunday = document.getElementById("sunday")
    const monday = document.getElementById("monday")
    const tuesday = document.getElementById("tuesday")
    const wednesday = document.getElementById("wednesday")
    const thursday = document.getElementById("thursday")
    const friday = document.getElementById("friday")
    const saturday = document.getElementById("saturday")
    const dayInputs = [sunday, monday, tuesday, wednesday, thursday, friday, saturday]
    checkDay(dayInputs, days)

    const countrySelect = document.getElementById("country").childNodes
    const countries = (data.country||'').split(",")
    countrySelect.forEach(select => {
        if (countries.includes(select.value)) {
            select.setAttribute('selected', true)
        } 
    })
    $('.countrypicker').trigger('change');
    // open modal
    $("#modals-here").modal()
    $('#modals-here').on('hidden.bs.modal', function (e) {
        createBtn.classList.remove("hidden");
        button.classList.add("hidden");
        
    })
    // on button click
    button.addEventListener('click', () => {
        let daysValues = []
        dayInputs.forEach(input => {
            if (input.checked) {
                daysValues.push(input.value)
            }
        })
        const transaction = {
            id,
            start_time: start_time.value,
            end_time: end_time.value,
            redirect_percent: redirect_percent.value,
            url: url.value,
            colddown: document.getElementById("colddown").value,
            url_redirect: url_redirect.value,
            days: daysValues.join(','),
            country: $('#country').val(),//document.getElementById("country").value
        };
        fetch('/config/update', {
            method: 'PUT',
            body: JSON.stringify(transaction),
            headers: { "Content-Type": "application/json; charset=utf-8" }
        }).then(() => {
            location.reload()
        })
    })
}

function checkDay(inputs, days) {
    inputs.forEach(input => {
        if (days.includes(input.value)) {
            input.checked = true
        }
    })
}

function timeFormatter(params) {
    if (params.value) {
        const strArray = params.value.split(":")
        return strArray[0] + ":" + strArray[1]
    }
}


// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function () {
    console.log('page loaded');
    var gridDiv = document.querySelector('#myGrid');
    gridApi = agGrid.createGrid(gridDiv, gridOptions);

    const datasource = getServerSideDatasource();
    gridApi.setGridOption('serverSideDatasource', datasource);
});


function getServerSideDatasource() {
    return {
        getRows: (params) => {
            // console.log('[Datasource] - rows requested by grid: ', params.request);
            fetch('/config/data', {
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

function actionCellRenderer(params) {
    let eGui = document.createElement("div");
    eGui.innerHTML = `
        <button  
          class="btn btn-danger btn-row"
          data-action="delete">
               Delete  
        </button>
        <button  
          class="btn btn-info btn-row"
          data-action="edit">
               Edit
        </button>
        `
    eGui.classList.add("btn-group")
    return eGui;
}

function BtnCellRenderer() { }

BtnCellRenderer.prototype.init = function (params) {
    this.params = params;

    this.eGui = document.createElement("div")
    this.eGui.innerHTML = `
        <button  
          class="btn btn-danger btn-row"
          data-action="delete">
               Delete  
        </button>
        <button  
          class="btn btn-info btn-row"
          data-action="edit">
               Edit
        </button>
        `
    this.eGui.classList.add("btn-group")

    this.btnClickedHandler = this.btnClickedHandler.bind(this);
    this.eGui.addEventListener('click', this.btnClickedHandler);
}

BtnCellRenderer.prototype.getGui = function () {
    return this.eGui;
}

BtnCellRenderer.prototype.destroy = function () {
    this.eGui.removeEventListener('click', this.btnClickedHandler);
}

BtnCellRenderer.prototype.btnClickedHandler = function (event) {
    this.params.clicked(this.params.value);
}