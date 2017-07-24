var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            var Visual = (function () {
                function Visual(options) {
                    this.touchTimeoutId = null;
                    this.cellColorTop = visual.DEFAULT_CELL_COLOR_TOP;
                    this.host = options.host;
                    this.htmlElement = options.element;
                    this.stateManager = new visual.StateManager(this.host.createSelectionManager());
                }
                Visual.prototype.update = function (options) {
                    // update chosen cell color if needed
                    var dataView = options.dataViews[0];
                    if (dataView.metadata && dataView.metadata.objects) {
                        // as defined in capabilities.json
                        var cellColorObj = dataView.metadata.objects['cellColor'];
                        if (cellColorObj && cellColorObj['fill'])
                            this.cellColorTop = cellColorObj['fill'].solid.color;
                    }
                    // 
                    // BUILD VIEW MODEL
                    //
                    var dataViews = options.dataViews;
                    var viewModel = {
                        dateValuesByYear: {},
                        yearsList: [],
                        dateValueTable: {},
                    };
                    if (!dataViews || !dataViews[0] || !dataViews[0].categorical
                        || !dataViews[0].categorical.values || !dataViews[0].categorical.categories
                        || !dataViews[0].categorical.categories[0].source) {
                        // invalid dataViews
                        return viewModel;
                    }
                    var dates = dataViews[0].categorical.categories[0].values;
                    var values = dataViews[0].categorical.values[0].values;
                    // build DateValue objects for each date in data
                    var maxValue = 0; // track min and max values for dates
                    var minValue = 0;
                    for (var i = 0; i < dates.length; i++) {
                        // create DateValue out of date
                        var selectionId = this.host.createSelectionIdBuilder()
                            .withCategory(dataViews[0].categorical.categories[0], i)
                            .createSelectionId();
                        var dateValue = {
                            color: '',
                            date: dates[i],
                            value: values[i],
                            tooltipDataItems: [],
                            selectionId: selectionId
                        };
                        // index dateValue by year
                        var year = dateValue.date.getFullYear();
                        if (viewModel.dateValuesByYear[year] === undefined) {
                            viewModel.dateValuesByYear[year] = [];
                        }
                        viewModel.dateValuesByYear[year].push(dateValue);
                        // a model for the date's tooltip
                        dateValue.tooltipDataItems.push({
                            displayName: d3.time.format('%Y-%m-%d')(dates[i]),
                            value: '' + values[i],
                            color: null,
                            header: null
                        });
                        // add to dictionary
                        viewModel.dateValueTable[dateValue.date.toString()] = dateValue;
                        // update max and min values
                        if (i == 0 || minValue > dateValue.value)
                            minValue = dateValue.value;
                        if (i == 0 || maxValue < dateValue.value)
                            maxValue = dateValue.value;
                    }
                    // setup colors for each date
                    var ratio = 1 / (maxValue - minValue);
                    var r2 = parseInt(this.cellColorTop.substr(1, 2), 16);
                    var g2 = parseInt(this.cellColorTop.substr(3, 2), 16);
                    var b2 = parseInt(this.cellColorTop.substr(5, 2), 16);
                    var r1 = parseInt(visual.DEFAULT_CELL_COLOR_BOT.substr(1, 2), 16);
                    var g1 = parseInt(visual.DEFAULT_CELL_COLOR_BOT.substr(3, 2), 16);
                    var b1 = parseInt(visual.DEFAULT_CELL_COLOR_BOT.substr(5, 2), 16);
                    for (var year in viewModel.dateValuesByYear) {
                        var dateValues = viewModel.dateValuesByYear[year];
                        for (var i = 0; i < dateValues.length; i++) {
                            var percent = (dateValues[i].value - minValue) * ratio;
                            var resultRed = Math.abs(r1 + percent * (r2 - r1));
                            var resultGreen = Math.abs(g1 + percent * (g2 - g1));
                            var resultBlue = Math.abs(b1 + percent * (b2 - b1));
                            var rgb = resultBlue | (resultGreen << 8) | (resultRed << 16);
                            dateValues[i].color = '#' + (0x1000000 + rgb).toString(16).slice(1);
                        }
                    }
                    // build years list
                    for (var year in viewModel.dateValuesByYear)
                        viewModel.yearsList.push(parseInt(year));
                    viewModel.yearsList.sort();
                    //
                    // RENDERING
                    // 
                    var currentZoomLevel = this.stateManager.getZoomLevel();
                    if (currentZoomLevel === 0 /* ALL */)
                        this.renderAllZoom(options, viewModel);
                    else if (currentZoomLevel == 1 /* MONTH */)
                        this.renderMonthZoom(options, viewModel);
                };
                /** This function gets called for each of the objects defined in the capabilities
                 * files and allows you to select which of the objects and properties you
                 * want to expose to the users in the property pane.
                 * Objects and properties need to be defined in capabilities.json
                 * For example, when you choose a color for the cells in paintroller menu,
                 * this will be called. */
                Visual.prototype.enumerateObjectInstances = function (options) {
                    var instances = [];
                    switch (options.objectName) {
                        case 'cellColor':
                            var cellColor = {
                                objectName: 'cellColor',
                                displayName: 'Cells color',
                                selector: null,
                                properties: {
                                    // I think this updates the chosen cell color under the paint-roller menu
                                    fill: this.cellColorTop
                                }
                            };
                            instances.push(cellColor);
                            break;
                    }
                    return instances;
                };
                /**********************************************************************
                 *                             ALL ZOOM                               *
                 **********************************************************************/
                Visual.prototype.renderAllZoom = function (options, viewModel) {
                    var _this = this;
                    if (viewModel.yearsList.length == 0)
                        return;
                    var startYear = viewModel.yearsList[0];
                    var endYear = viewModel.yearsList[viewModel.yearsList.length - 1];
                    // svg dimensions bound by viewport
                    var numRowsOfMonths = 4;
                    var widthTrim = 10; // prevent float issue
                    var svgWidth = (viewModel.yearsList.length === 1)
                        ? options.viewport.width - widthTrim
                        : options.viewport.width / 2 - widthTrim;
                    // cell size, constrain it by the current width of the visual's viewport
                    this.cellSizeAllZoom = ((svgWidth - 20) - (visual.MONTH_VERTICAL_PAD_ALL_ZOOM * numRowsOfMonths)) /
                        (visual.NUM_DAYS_PER_WEEK * visual.NUM_MONTHS_PER_ROW);
                    var svgHeight = (numRowsOfMonths * (visual.MAX_NUM_WEEKS_A_MONTH * this.cellSizeAllZoom + visual.MONTH_HORIZONTAL_PAD_ALL_ZOOM))
                        + visual.TOP_PAD_ALL_ZOOM + 10;
                    var body = d3.select(this.htmlElement);
                    body.selectAll('svg').remove();
                    var svgGroup = body.selectAll('svg')
                        .data(d3.range(startYear, endYear + 1))
                        .enter().append('svg')
                        .classed('svgYear', true)
                        .text(function (d) { return d; })
                        .attr('width', svgWidth)
                        .attr('height', svgHeight);
                    // render group container for each year
                    var yearGroup = svgGroup.append('g')
                        .classed('year', true)
                        .attr('transform', 'translate(30,20)'); // offsets
                    // year labels 
                    yearGroup.append('text')
                        .style('text-anchor', 'middle')
                        .attr('font-size', 20)
                        .text(function (year) { return "" + year; });
                    // <g> for all months
                    var monthGroup = yearGroup.selectAll('g')
                        .data(function (year) {
                        var months = [];
                        for (var i = visual.Month.JAN; i <= visual.Month.DEC; i++) {
                            var datum = {
                                'month': i,
                                'year': year
                            };
                            months.push(datum);
                        }
                        return months;
                    })
                        .enter().append('g')
                        .classed('month', true)
                        .attr('fill', 'none')
                        .attr('stroke', '#bbb')
                        .attr('transform', function (datum) {
                        // set x,y offsets for each month <g>
                        var col = datum['month'] % 3;
                        var row = Math.floor(datum['month'] / 3);
                        var x = (col * _this.cellSizeAllZoom * visual.NUM_DAYS_PER_WEEK) + (col * visual.MONTH_VERTICAL_PAD_ALL_ZOOM);
                        var y = (row * _this.cellSizeAllZoom * visual.MAX_NUM_WEEKS_A_MONTH) + (row * visual.MONTH_HORIZONTAL_PAD_ALL_ZOOM) + visual.TOP_PAD_ALL_ZOOM;
                        return "translate(" + x + ", " + y + ")";
                    });
                    // labeling
                    var dayY = '13';
                    var monthFontSize = this.cellSizeAllZoom * 0.705;
                    var dayFontSize = this.cellSizeAllZoom * 0.5882;
                    // months
                    var self = this;
                    monthGroup.append('text')
                        .text(function (datum) { return visual.Month[datum.month] + " " + datum.year; })
                        .attr('x', '30')
                        .style('text-anchor', 'start')
                        .attr('font-size', monthFontSize)
                        .on('mouseover', function () { self.addMonthHoverStyling.call(this, self.cellColorTop); })
                        .on('mouseout', this.removeMonthHoverStyling)
                        .on('click', function (datum) {
                        // GO TO MONTH ZOOM
                        _this.stateManager.clearSelections();
                        _this.stateManager.selectMonth(viewModel, datum.month, datum.year);
                        _this.renderMonthZoom(options, viewModel);
                    });
                    // days
                    var dayXCoordTable = this.getDayLabelXCoordTable(0 /* ALL */, visual.WEEK_FORMAT);
                    for (var _i = 0, dayXCoordTable_1 = dayXCoordTable; _i < dayXCoordTable_1.length; _i++) {
                        var dayXCoord = dayXCoordTable_1[_i];
                        monthGroup.append('text')
                            .text(dayXCoord[0])
                            .attr('x', dayXCoord[1]).attr('y', dayY)
                            .style('text-anchor', 'middle')
                            .attr('font-size', dayFontSize);
                    }
                    // <rect> cells for each day per month
                    var rectGroup = monthGroup
                        .append('g')
                        .classed('unselected', true)
                        .selectAll('rect')
                        .data(function (datum) {
                        var start = new Date(datum['year'], datum['month'], 1);
                        var end = new Date(datum['year'], datum['month'] + 1, 1);
                        return d3.time.days(start, end);
                    })
                        .enter().append('rect');
                    // Add selected group   
                    monthGroup.append('g')
                        .classed('selected', true);
                    this.renderDateRects(rectGroup, viewModel);
                    this.renderBodyElement(viewModel);
                };
                /**********************************************************************
                 *                             MONTH ZOOM                             *
                 **********************************************************************/
                Visual.prototype.renderMonthZoom = function (options, viewModel) {
                    var _this = this;
                    if (viewModel.yearsList.length === 0)
                        return;
                    var selectedMonth = visual.Month[this.stateManager.getSelectedMonth()];
                    var selectedYear = this.stateManager.getSelectedYear();
                    var svgWidth = options.viewport.width - 20;
                    var calendarWidth = (svgWidth - visual.LEFT_PAD_MONTH_ZOOM - visual.RIGHT_PAD_MONTH_ZOOM);
                    this.cellSizeMonthZoom = calendarWidth / visual.NUM_DAYS_PER_WEEK;
                    var svgHeight = this.cellSizeMonthZoom * visual.MAX_NUM_WEEKS_A_MONTH + visual.TOP_PAD_MONTH_ZOOM + 10;
                    var body = d3.select(this.htmlElement);
                    body.selectAll('svg').remove();
                    var svgMonth = body.append('svg')
                        .classed('svgMonth', true)
                        .attr('width', svgWidth)
                        .attr('height', svgHeight);
                    // Create Marker definition and path for back button
                    var monthFontSize = this.cellSizeMonthZoom / 2;
                    var xAxisStart = 70;
                    var xAxistEnd = 70;
                    var yAxisStart = 60;
                    var yAxisEnd = yAxisStart - monthFontSize;
                    var data = [{ id: 0, name: 'arrow', path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z', linePath: 'M ' + xAxisStart.toString() + ',' + yAxisStart.toString() + ' L ' + xAxistEnd.toString() + ',' + yAxisEnd.toString(), viewbox: '-5 -5 10 10' }];
                    svgMonth.append('rect')
                        .attr('x', 60).attr('y', yAxisEnd - 8).attr("width", 20).attr("height", yAxisStart - yAxisEnd + 8)
                        .attr('fill', "white")
                        .on('click', function () {
                        // go back to ALL zoom
                        _this.stateManager.clearSelections();
                        _this.stateManager.setAllZoom();
                        _this.renderAllZoom(options, viewModel);
                    });
                    var defs = svgMonth.append("svg:defs");
                    var paths = svgMonth.append('svg:g').attr('id', 'markers');
                    var marker = defs.selectAll('marker')
                        .data(data).enter()
                        .append('svg:marker').attr('id', function (d) { return 'marker_' + d.name; })
                        .attr('markerHeight', 5).attr('markerWidth', 5).attr('markerUnits', 'strokeWidth').attr('orient', 'auto')
                        .attr('refX', 0).attr('refY', 0)
                        .attr('viewBox', function (d) { return d.viewbox; })
                        .append('svg:path')
                        .attr('d', function (d) { return d.path; })
                        .attr('fill', visual.Color[visual.Color.GREY]);
                    var path = paths.selectAll('path')
                        .data(data).enter().append('svg:path')
                        .attr('d', function (d) { return d.linePath; })
                        .attr('stroke', visual.Color[visual.Color.GREY])
                        .attr('stroke-width', 3)
                        .attr('stroke-linecap', 'round')
                        .attr('marker-end', function (d, i) { return 'url(#marker_' + d.name + ')'; })
                        .on('click', function () {
                        // go back to ALL zoom
                        _this.stateManager.clearSelections();
                        _this.stateManager.setAllZoom();
                        _this.renderAllZoom(options, viewModel);
                    });
                    // month and year label
                    svgMonth.append('text')
                        .style('text-anchor', 'start')
                        .attr('font-size', this.cellSizeMonthZoom * .5)
                        .attr('x', visual.LEFT_PAD_MONTH_ZOOM + 70).attr('y', visual.TOP_PAD_MONTH_ZOOM - 40)
                        .attr('fill', visual.Color[visual.Color.GREY])
                        .text(selectedMonth + " " + selectedYear);
                    // day labels
                    var dayXCoordTable = this.getDayLabelXCoordTable(1 /* MONTH */, visual.WEEK_FORMAT);
                    for (var _i = 0, dayXCoordTable_2 = dayXCoordTable; _i < dayXCoordTable_2.length; _i++) {
                        var dayXCoord = dayXCoordTable_2[_i];
                        svgMonth.append('text')
                            .style('text-anchor', 'start')
                            .attr('font-size', this.cellSizeMonthZoom * .3)
                            .attr('x', dayXCoord[1]).attr('y', visual.TOP_PAD_MONTH_ZOOM - 10)
                            .attr('fill', visual.Color[visual.Color.GREY])
                            .text(dayXCoord[0]);
                    }
                    //
                    // rects for days
                    //
                    var dates = this.stateManager.getDaysInMonthBySelectedMonth(this.stateManager.getSelectedMonth(), selectedYear, viewModel);
                    var datesOfMonthSelected = dates.selectedDays;
                    var datesOfMonth = dates.unselectedDays;
                    var month = this.stateManager.getSelectedMonth();
                    var unselectedGroup = svgMonth.append('g')
                        .classed('unselected', true);
                    var selectedGroup = svgMonth.append('g')
                        .classed('selected', true);
                    var unselectedRectGroup = unselectedGroup.selectAll('rect')
                        .data(datesOfMonth)
                        .enter().append('rect');
                    this.renderDateRects(unselectedRectGroup, viewModel);
                    var selectedRectGroup = selectedGroup.selectAll('rect')
                        .data(datesOfMonthSelected)
                        .enter().append('rect');
                    this.renderDateRects(selectedRectGroup, viewModel);
                    // show dates for sundays
                    // date box
                    var allDatesOfMonth = datesOfMonth.concat(datesOfMonthSelected);
                    var strokeWidth = visual.STROKE_WIDTH_MONTH_ZOOM;
                    var strokeModifier = calendarWidth * .008;
                    var dateBoxSize = ((strokeWidth - 1) * strokeModifier) * 2;
                    var zoomLevel = this.stateManager.getZoomLevel();
                    svgMonth.selectAll('g g')
                        .data(allDatesOfMonth.filter(function (date) {
                        return date.getDay() === 0;
                    }))
                        .enter().append('rect')
                        .attr('width', dateBoxSize)
                        .attr('height', dateBoxSize)
                        .attr('x', function (date) {
                        var rectX = _this.setXCoordinateOfDay(date, zoomLevel);
                        return rectX + _this.cellSizeMonthZoom - (dateBoxSize);
                    })
                        .attr('y', function (date) {
                        return _this.setYCoordinateOfDay(date, zoomLevel);
                    })
                        .attr('fill', function (date) {
                        var dateValue = viewModel.dateValueTable[date.toString()];
                        return (dateValue) ? dateValue.color : visual.Color[visual.Color.WHITE];
                    })
                        .attr('stroke', function (date) {
                        return visual.DATE_UNSELECTED_COLOR;
                    })
                        .attr('stroke-width', strokeWidth + "px");
                    // date number
                    svgMonth.selectAll('g g')
                        .data(allDatesOfMonth.filter(function (date) {
                        return date.getDay() === 0;
                    }))
                        .enter().append('text')
                        .style('text-anchor', 'end')
                        .attr('font-size', this.cellSizeMonthZoom * .2)
                        .attr('fill', visual.Color[visual.Color.GREY])
                        .attr('x', function (date) {
                        var rectX = _this.setXCoordinateOfDay(date, zoomLevel);
                        return rectX + _this.cellSizeMonthZoom - ((strokeWidth - 2.85) * strokeModifier);
                    })
                        .attr('y', function (date) {
                        var rectY = _this.setYCoordinateOfDay(date, zoomLevel);
                        return rectY + ((strokeWidth) * strokeModifier);
                    })
                        .text(function (date) {
                        return date.getDate();
                    });
                    this.renderBodyElement(viewModel);
                };
                Visual.prototype.renderDateRects = function (rectGroup, viewModel) {
                    var _this = this;
                    var zoomLevel = this.stateManager.getZoomLevel();
                    var strokeWidth;
                    var cellSize;
                    if (zoomLevel === 0 /* ALL */) {
                        strokeWidth = visual.STROKE_WIDTH_ALL_ZOOM;
                        cellSize = this.cellSizeAllZoom;
                    }
                    else if (zoomLevel === 1 /* MONTH */) {
                        strokeWidth = visual.STROKE_WIDTH_MONTH_ZOOM;
                        cellSize = this.cellSizeMonthZoom;
                    }
                    else {
                        strokeWidth = 1;
                        cellSize = this.cellSizeAllZoom;
                    }
                    rectGroup.classed('day', true)
                        .attr("width", cellSize)
                        .attr("height", cellSize)
                        .attr("x", function (date) {
                        return _this.setXCoordinateOfDay(date, zoomLevel);
                    })
                        .attr("y", function (date) {
                        return _this.setYCoordinateOfDay(date, zoomLevel);
                    })
                        .attr('fill', function (date) {
                        var dateValue = viewModel.dateValueTable[date.toString()];
                        return (dateValue) ? dateValue.color : visual.Color[visual.Color.WHITE];
                    })
                        .attr('stroke', function (date) {
                        var isSelected = _this.stateManager.isDateSelected(date, viewModel);
                        return (isSelected) ? visual.DATE_SELECTED_COLOR : visual.DATE_UNSELECTED_COLOR;
                    })
                        .attr('stroke-width', strokeWidth + "px")
                        .each(function (date, j, i) {
                        var dateValue = viewModel.dateValueTable[date.toString()];
                        if (dateValue) {
                            visual.assert(rectGroup !== undefined, 'error: rectgroup is undefined');
                            visual.assert(rectGroup[i] !== undefined, "error: rectgroup[" + i + "] is undefined");
                            visual.assert(rectGroup[i][j] !== undefined, "error: rectgroup[" + i + "][" + j + "] is undefined");
                            var rect = d3.select(rectGroup[i][j]);
                            visual.assert(rect !== undefined, 'error: selecting it is undefined');
                        }
                    })
                        .on('mouseover.tooltip', function (date) {
                        _this.renderTooltip(date, viewModel, false);
                    })
                        .on('mousemove.tooltip', function (date) {
                        _this.renderTooltip(date, viewModel, true);
                    })
                        .on('mouseout.tooltip', function (date) {
                        _this.host.tooltipService.hide({
                            isTouchEvent: false,
                            immediately: false
                        });
                    });
                    // handle single/multi selections
                    rectGroup.on('mousedown', function (date) {
                        var mouseEvent = d3.event;
                        var dateValue = viewModel.dateValueTable[date.toString()];
                        if (!mouseEvent.shiftKey && !mouseEvent.ctrlKey) {
                            if (_this.stateManager.activeSelectionCount() == 1 && _this.stateManager.isDateSelected(date, viewModel)) {
                                _this.stateManager.unSelect(date, viewModel);
                            }
                            else {
                                _this.stateManager.clearSelections();
                                _this.stateManager.select(dateValue, 2 /* NONE */, viewModel);
                            }
                            // clicking outside of month in month zoom should change back to month selection
                            var dateInData = _this.stateManager.isDateInData(dateValue);
                            if (!dateInData && _this.stateManager.getZoomLevel() === 1 /* MONTH */)
                                _this.stateManager.selectMonth(viewModel);
                        }
                        else if (mouseEvent.shiftKey) {
                            _this.stateManager.clearSelections();
                            _this.stateManager.select(dateValue, 0 /* SHIFT */, viewModel);
                        }
                        else if (mouseEvent.ctrlKey) {
                            if (_this.stateManager.isDateSelected(date, viewModel))
                                _this.stateManager.unSelect(date, viewModel);
                            else
                                _this.stateManager.select(dateValue, 1 /* CTRL */, viewModel);
                        }
                        _this.reorderDaysBySelection(viewModel);
                    });
                };
                Visual.prototype.reorderDaysBySelection = function (viewModel) {
                    var svgMonthSelection;
                    switch (this.stateManager.getZoomLevel()) {
                        case 0 /* ALL */:
                            svgMonthSelection = d3.select(this.htmlElement).selectAll('svg g.year g.month');
                            for (var i = 0; i < viewModel.yearsList.length; i++) {
                                for (var j = 0; j < 12; j++) {
                                    var month = svgMonthSelection.filter(function (n) {
                                        return j === n.month && viewModel.yearsList[i] === n.year;
                                    });
                                    if (month.length > 0) {
                                        var dates_1 = this.stateManager.getDaysInMonthBySelectedMonth(j, viewModel.yearsList[i], viewModel);
                                        this.reorderDaysByMonth(month, dates_1, viewModel);
                                    }
                                }
                            }
                            break;
                        case 1 /* MONTH */:
                            var dates = this.stateManager.getDaysInMonthBySelectedMonth(this.stateManager.getSelectedMonth(), this.stateManager.getSelectedYear(), viewModel);
                            svgMonthSelection = d3.select('svg.svgMonth');
                            this.reorderDaysByMonth(svgMonthSelection, dates, viewModel);
                            break;
                    }
                };
                Visual.prototype.reorderDaysByMonth = function (svgMonth, dates, viewModel) {
                    var addToSelected = removeChangedDays(svgMonth.selectAll('g.unselected rect'), dates.unselectedDays);
                    var addToUnselected = removeChangedDays(svgMonth.selectAll('g.selected rect'), dates.selectedDays);
                    addChangedDays(addToSelected, svgMonth.selectAll('g.selected'));
                    addChangedDays(addToUnselected, svgMonth.selectAll('g.unselected'));
                    renderDayStroke(svgMonth.selectAll('g.unselected rect'), visual.DATE_UNSELECTED_COLOR);
                    renderDayStroke(svgMonth.selectAll('g.selected rect'), visual.DATE_SELECTED_COLOR);
                    function removeChangedDays(monthSelection, baseDateArr) {
                        return monthSelection.filter(function (datum, index, outerIndex) {
                            return baseDateArr.map(function (n) { return n.valueOf(); }).indexOf(datum.valueOf()) == -1;
                        }).remove();
                    }
                    function addChangedDays(changedSelection, destinationSelection) {
                        changedSelection[0].forEach(function (n) {
                            var date = getDataFromElement(n);
                            destinationSelection
                                .append(function () { return n; })
                                .data([date])
                                .enter();
                        });
                    }
                    function renderDayStroke(selection, stroke) {
                        selection.attr('stroke', stroke);
                    }
                    function getDataFromElement(elem) {
                        return elem.__data__;
                    }
                };
                Visual.prototype.renderBodyElement = function (viewModel) {
                    var _this = this;
                    // setting up body element
                    var body = d3.select(this.htmlElement);
                    var rectGroup = body.selectAll('rect');
                    body.style('overflow', 'auto');
                    body.on('mousedown', function () {
                        var mouseEvent = d3.event;
                        // body ALSO hit if date already selected and clicked again with modifier
                        if (!mouseEvent.ctrlKey && !mouseEvent.shiftKey) {
                            var reRender = _this.stateManager.hasActiveSelection();
                            _this.stateManager.clearSelections();
                            _this.stateManager.setAnchor(null);
                            if (_this.stateManager.getZoomLevel() === 1 /* MONTH */)
                                _this.stateManager.selectMonth(viewModel);
                            if (reRender) {
                                _this.reorderDaysBySelection(viewModel);
                            }
                        }
                    });
                    // render individual day selection on update
                    this.reorderDaysBySelection(viewModel);
                };
                Visual.prototype.setXCoordinateOfDay = function (date, zoomLevel) {
                    var day = date.getDay();
                    if (visual.WEEK_FORMAT === 1 /* MON_SUN */) {
                        // Date object gives Sunday as 0, but we need it as 6
                        day = (day === 0) ? 6 /* SUN */ : day - 1;
                    }
                    if (zoomLevel === 0 /* ALL */)
                        return day * this.cellSizeAllZoom;
                    else if (zoomLevel === 1 /* MONTH */)
                        return day * this.cellSizeMonthZoom + visual.LEFT_PAD_MONTH_ZOOM;
                };
                Visual.prototype.setYCoordinateOfDay = function (date, zoomLevel) {
                    var firstDayOfWeekInMonth = d3.time.month.floor(date).getDay();
                    if (visual.WEEK_FORMAT === 1 /* MON_SUN */) {
                        // We need Sunday as 6 instead of 0
                        firstDayOfWeekInMonth = (firstDayOfWeekInMonth === 0)
                            ? 6 /* SUN */ : firstDayOfWeekInMonth - 1;
                    }
                    var offset = firstDayOfWeekInMonth - 1;
                    var weekOfMonth = Math.floor((date.getDate() + offset) / visual.NUM_DAYS_PER_WEEK);
                    if (zoomLevel === 0 /* ALL */)
                        return weekOfMonth * this.cellSizeAllZoom + visual.TOP_PAD_DATES_ALL_ZOOM;
                    else if (zoomLevel === 1 /* MONTH */)
                        return weekOfMonth * this.cellSizeMonthZoom + visual.TOP_PAD_MONTH_ZOOM;
                };
                Visual.prototype.getDayLabelXCoordTable = function (zoomLevel, weekFormat) {
                    var cellSize, offset;
                    if (zoomLevel === 0 /* ALL */) {
                        cellSize = this.cellSizeAllZoom;
                        offset = 10;
                    }
                    else if (zoomLevel === 1 /* MONTH */) {
                        cellSize = this.cellSizeMonthZoom;
                        offset = visual.LEFT_PAD_MONTH_ZOOM + 20;
                    }
                    var dayXCoordTable = [
                        ['Su', 0 * cellSize + offset],
                        ['Mo', 1 * cellSize + offset],
                        ['Tu', 2 * cellSize + offset],
                        ['We', 3 * cellSize + offset],
                        ['Th', 4 * cellSize + offset],
                        ['Fr', 5 * cellSize + offset],
                        ['Sa', 6 * cellSize + offset]
                    ];
                    if (weekFormat === 1 /* MON_SUN */) {
                        // Move Sunday to the end of the list and redo offsets
                        dayXCoordTable.push(dayXCoordTable.shift());
                        for (var i = 0; i < visual.NUM_DAYS_PER_WEEK; i++)
                            dayXCoordTable[i][1] = i * cellSize + offset;
                    }
                    return dayXCoordTable;
                };
                Visual.prototype.renderTooltip = function (date, viewModel, isMoving) {
                    // can display tooltip if mouse button is not pressed
                    var mouseEvent = d3.event;
                    var canDisplayTooltip = true;
                    if (mouseEvent.buttons !== undefined)
                        canDisplayTooltip = (mouseEvent.buttons === 0);
                    // also don't ignore mouse events immediately after touch end
                    canDisplayTooltip = canDisplayTooltip && (this.touchTimeoutId == null || this.touchTimeoutId == undefined);
                    if (!canDisplayTooltip)
                        return;
                    var isPointerEvent = window['PointerEvent'];
                    // dates without corresponding data will not be in dateValueTable
                    var dateValue = viewModel.dateValueTable[date.toString()];
                    var dataItems;
                    if (dateValue !== undefined) {
                        dataItems = dateValue.tooltipDataItems;
                    }
                    else {
                        dataItems = [{
                                displayName: d3.time.format('%Y-%m-%d')(new Date(date)),
                                value: '0',
                                color: null,
                                header: null
                            }];
                    }
                    var tooltipOptions = {
                        coordinates: this.getMouseCoordinates(this.htmlElement, isPointerEvent),
                        isTouchEvent: false,
                        dataItems: dataItems,
                        identities: [] // TODO something to do with selectionId? now hardcoded empty
                    };
                    if (isMoving)
                        this.host.tooltipService.move(tooltipOptions);
                    else
                        this.host.tooltipService.show(tooltipOptions);
                };
                Visual.prototype.getMouseCoordinates = function (element, isPointerEvent) {
                    var coordinates;
                    if (isPointerEvent) {
                        // copied from d3_eventSource (which is not exposed)
                        var e = d3.event;
                        var s = void 0;
                        while (s = e.sourceEvent) {
                            e = s;
                        }
                        var rect = element.getBoundingClientRect();
                        coordinates = [
                            e.clientX - rect.left - element.clientLeft,
                            e.clientY - rect.top - element.clientTop
                        ];
                    }
                    else {
                        var touchCoordinates = d3.touches(element);
                        if (touchCoordinates && touchCoordinates.length > 0) {
                            coordinates = touchCoordinates[0];
                        }
                    }
                    return coordinates;
                };
                // Event Callbacks for Link/View Navigation Styling
                Visual.prototype.addMonthHoverStyling = function (color, textElem) {
                    textElem = textElem && textElem instanceof Element ? textElem : this;
                    textElem.setAttribute('stroke', color);
                    textElem.setAttribute('fill', color);
                };
                Visual.prototype.removeMonthHoverStyling = function (textElem) {
                    textElem = textElem && textElem instanceof Element ? textElem : this;
                    textElem.removeAttribute('stroke');
                    textElem.removeAttribute('fill');
                };
                return Visual;
            }());
            visual.Visual = Visual;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            ;
            ;
            /** Manages date selections and zoom views */
            var StateManager = (function () {
                function StateManager(selectionManager) {
                    this.selectionManager = selectionManager;
                    this.selectedDateValues = [];
                    this.setAnchor(null);
                    this.setAllZoom();
                }
                /** On click, select date to be added to existing selections */
                StateManager.prototype.select = function (dateValue, modifier, viewModel) {
                    if (!this.isDateInData(dateValue)) {
                        this.setAnchor(null);
                        event.stopPropagation();
                        this.assertSelections();
                        return;
                    }
                    // based on Windows multi selection behaviors in Explorer GUI
                    if (this.selectedDateValues.length > 0) {
                        assert(this.anchorSelection !== null, 'ERROR: Anchor does not exist when it should');
                    }
                    if (modifier === 2 /* NONE */ || modifier === 1 /* CTRL */ || this.anchorSelection === null) {
                        this.setAnchor(dateValue);
                    }
                    var selectionIdsToAdd = [];
                    if (modifier === 2 /* NONE */ || modifier === 1 /* CTRL */) {
                        // Note: selection manager doesn't seem to add anything on top of existing selections
                        // So make list of all currently selected dates to re-add
                        this.selectedDateValues.push(dateValue);
                        selectionIdsToAdd = this.buildSelectedSelectionIds();
                    }
                    else if (modifier === 0 /* SHIFT */) {
                        // Get Min and Max Selected dates selected via anchor and current Shift select
                        var anchorDateValue = this.getAnchor();
                        var shiftDateValue = dateValue;
                        var maxDate = void 0;
                        var minDate = void 0;
                        if (anchorDateValue.date < shiftDateValue.date) {
                            maxDate = shiftDateValue.date;
                            minDate = anchorDateValue.date;
                        }
                        else {
                            maxDate = anchorDateValue.date;
                            minDate = shiftDateValue.date;
                        }
                        var allValueDates = viewModel.dateValueTable;
                        for (var key in allValueDates) {
                            if (allValueDates[key].date >= minDate && allValueDates[key].date <= maxDate) {
                                this.selectedDateValues.push(allValueDates[key]);
                            }
                            ;
                        }
                        selectionIdsToAdd = this.buildSelectedSelectionIds();
                    }
                    return this.makeSelection(selectionIdsToAdd).then(function () {
                        event.stopPropagation();
                    });
                };
                StateManager.prototype.makeSelection = function (selectionIds) {
                    var _this = this;
                    var promise = this.selectionManager.select(selectionIds);
                    return promise.then(function () {
                        _this.assertSelections();
                    });
                };
                /** Select all of dates for month for month zoom view. Clears selectedDateValues, selects
                 *  dates for selection manager, does not render strokes */
                StateManager.prototype.selectMonth = function (viewModel, selectedMonth, selectedYear) {
                    var _this = this;
                    // clear selectedDateValues
                    while (this.selectedDateValues.length)
                        this.selectedDateValues.pop();
                    if (this.zoomLevel === 1 /* MONTH */) {
                        assert(this.selectedMonth !== null && this.selectedYear !== null, 'ERROR: month zoom needs month and year');
                    }
                    else {
                        this.zoomLevel = 1 /* MONTH */;
                        this.selectedMonth = (selectedMonth !== undefined) ? selectedMonth : this.selectedMonth;
                        this.selectedYear = (selectedYear !== undefined) ? selectedYear : this.selectedYear;
                        this.setAnchor(null);
                    }
                    var dateValues = viewModel.dateValuesByYear[this.selectedYear];
                    if (!dateValues)
                        return;
                    var datesOfMonth = dateValues.filter(function (dv) { return dv.date.getMonth() === _this.selectedMonth; });
                    return this.makeSelection(this.buildSelectedSelectionIds(datesOfMonth));
                };
                /** CTRL clicking on a selected date. Updates anchor to this. */
                StateManager.prototype.unSelect = function (date, viewModel) {
                    var dateValue = viewModel.dateValueTable[date.toString()];
                    assert(dateValue !== undefined, 'ERROR: dateValue to be unselected is not in data');
                    // same as Windows Explorer GUI behavior
                    this.setAnchor(dateValue);
                    if (this.selectedDateValues.length === 1) {
                        this.clearSelections();
                        if (this.zoomLevel === 1 /* MONTH */)
                            this.selectMonth(viewModel, this.selectedMonth, this.selectedYear);
                        return;
                    }
                    // remove from selectedDateValues
                    var dateValueIndex = this.selectedDateValues.indexOf(dateValue);
                    assert(dateValueIndex > -1, 'ERROR: dateValue to be unselected is not selected');
                    this.selectedDateValues.splice(dateValueIndex, 1);
                    // select all dates again without date arg
                    var selectionIdsToReAdd = this.buildSelectedSelectionIds();
                    return this.makeSelection(selectionIdsToReAdd);
                };
                /** Clear selectedDateValues and selection manager. Does not clear anchor */
                StateManager.prototype.clearSelections = function () {
                    var _this = this;
                    // clear selectedDateValues
                    while (this.selectedDateValues.length)
                        this.selectedDateValues.pop();
                    // clear manager
                    this.selectionManager.clear().then(function () {
                        _this.assertSelections();
                    });
                };
                StateManager.prototype.isDateInData = function (dateValue) {
                    return dateValue !== undefined && dateValue !== null
                        && dateValue.selectionId !== undefined && dateValue.selectionId !== null;
                };
                /** Does DateValue exist in selectedDateValues only */
                StateManager.prototype.isDateSelected = function (date, viewModel) {
                    var dateValue = viewModel.dateValueTable[date.toString()];
                    if (dateValue && dateValue.selectionId && this.selectedDateValues.length > 0) {
                        var dateIdKey = dateValue.selectionId.getKey();
                        for (var _i = 0, _a = this.selectedDateValues; _i < _a.length; _i++) {
                            var selected = _a[_i];
                            if (selected.selectionId && selected.selectionId.getKey() === dateIdKey) {
                                return true;
                            }
                        }
                    }
                    return false;
                };
                StateManager.prototype.getDaysInMonthBySelectedMonth = function (month, year, viewModel) {
                    var dates = {
                        selectedDays: [],
                        unselectedDays: []
                    };
                    var date = new Date(year, month, 1);
                    while (date.getMonth() === month) {
                        if (this.isDateSelected(date, viewModel)) {
                            dates.selectedDays.push(new Date(date));
                        }
                        else {
                            dates.unselectedDays.push(new Date(date));
                        }
                        date.setDate(date.getDate() + 1);
                    }
                    return dates;
                };
                StateManager.prototype.getZoomLevel = function () { return this.zoomLevel; };
                StateManager.prototype.getSelectedMonth = function () { return this.selectedMonth; };
                StateManager.prototype.getSelectedYear = function () { return this.selectedYear; };
                StateManager.prototype.hasActiveSelection = function () { return this.selectionManager.hasSelection(); };
                StateManager.prototype.activeSelectionCount = function () { return this.selectedDateValues.length; };
                StateManager.prototype.setAllZoom = function () {
                    this.zoomLevel = 0 /* ALL */;
                    this.selectedMonth = null;
                    this.selectedYear = null;
                    this.setAnchor(null);
                };
                StateManager.prototype.setAnchor = function (anchor) {
                    if (this.anchorSelection === null && anchor === null)
                        return;
                    this.anchorSelection = anchor;
                };
                StateManager.prototype.getAnchor = function () {
                    return this.anchorSelection;
                };
                StateManager.prototype.buildSelectedSelectionIds = function (dateValues) {
                    if (!dateValues)
                        dateValues = this.selectedDateValues;
                    var selectionIds = [];
                    for (var _i = 0, dateValues_1 = dateValues; _i < dateValues_1.length; _i++) {
                        var dv = dateValues_1[_i];
                        assert(dv.selectionId !== undefined || dv.selectionId !== null);
                        selectionIds.push(dv.selectionId);
                    }
                    return selectionIds;
                };
                /** for debugging */
                StateManager.prototype.assertSelections = function () {
                    // console.log(this.selectedDateValues.length + ' selected');
                    // in month zoom, nothing selected requires all of dates to be selected in selection manager
                    if (this.zoomLevel === 1 /* MONTH */)
                        return;
                    assert(this.selectedDateValues.length === this.selectionManager.getSelectionIds().length, 'ERROR: selection lengths don"t match: DateValues=${dvLen}, selectionIds=${selectionIdsLen}');
                };
                return StateManager;
            }());
            visual.StateManager = StateManager;
            /** Debug function in lieu of unit testing */
            function assert(expression, msg) {
                if (msg === void 0) { msg = 'ERROR: An assertion failed'; }
                try {
                    if (!expression)
                        throw msg;
                }
                catch (e) {
                    console.log(e);
                }
            }
            visual.assert = assert;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            //
            // ENUMS
            //
            var Color;
            (function (Color) {
                Color[Color["RED"] = 0] = "RED";
                Color[Color["GREEN"] = 1] = "GREEN";
                Color[Color["BLUE"] = 2] = "BLUE";
                Color[Color["YELLOW"] = 3] = "YELLOW";
                Color[Color["WHITE"] = 4] = "WHITE";
                Color[Color["PURPLE"] = 5] = "PURPLE";
                Color[Color["ORANGE"] = 6] = "ORANGE";
                Color[Color["GREY"] = 7] = "GREY";
            })(Color = visual.Color || (visual.Color = {}));
            var Month;
            (function (Month) {
                Month[Month["JAN"] = 0] = "JAN";
                Month[Month["FEB"] = 1] = "FEB";
                Month[Month["MAR"] = 2] = "MAR";
                Month[Month["APR"] = 3] = "APR";
                Month[Month["MAY"] = 4] = "MAY";
                Month[Month["JUN"] = 5] = "JUN";
                Month[Month["JUL"] = 6] = "JUL";
                Month[Month["AUG"] = 7] = "AUG";
                Month[Month["SEP"] = 8] = "SEP";
                Month[Month["OCT"] = 9] = "OCT";
                Month[Month["NOV"] = 10] = "NOV";
                Month[Month["DEC"] = 11] = "DEC";
            })(Month = visual.Month || (visual.Month = {}));
            //
            // CONSTANTS AND SETTINGS
            //
            visual.WEEK_FORMAT = 0 /* SUN_SAT */; // change week format here
            visual.MAX_NUM_WEEKS_A_MONTH = 6;
            visual.NUM_DAYS_PER_WEEK = 7;
            visual.NUM_MONTHS_PER_ROW = 3;
            // ALL VIEW 
            visual.MONTH_HORIZONTAL_PAD_ALL_ZOOM = 40;
            visual.MONTH_VERTICAL_PAD_ALL_ZOOM = 20;
            visual.TOP_PAD_ALL_ZOOM = 20;
            visual.TOP_PAD_DATES_ALL_ZOOM = 20;
            visual.STROKE_WIDTH_ALL_ZOOM = 1;
            // MONTH VIEW
            visual.LEFT_PAD_MONTH_ZOOM = 20;
            visual.RIGHT_PAD_MONTH_ZOOM = 20;
            visual.TOP_PAD_MONTH_ZOOM = 100;
            visual.STROKE_WIDTH_MONTH_ZOOM = 4;
            visual.DATE_SELECTED_COLOR = '#000000';
            visual.DATE_UNSELECTED_COLOR = '#999';
            visual.DEFAULT_CELL_COLOR_TOP = '#01B8AA';
            visual.DEFAULT_CELL_COLOR_BOT = '#dddddd';
            visual.DEFAULT_TOUCH_DELAY = 1000;
            visual.UNSELECTED_STROKE_ATTR = 'oldStyle';
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
//# sourceMappingURL=visual.js.map