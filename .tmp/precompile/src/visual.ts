module powerbi.extensibility.visual.CalendarVisualA45056645E4E428B9D26EF971839A6B2  {

    export class Visual implements IVisual {

        private readonly host: IVisualHost;
        private readonly htmlElement: HTMLElement;
        private readonly touchTimeoutId: number = null;
        private readonly stateManager: StateManager;
        private cellColorTop: string = DEFAULT_CELL_COLOR_TOP;
        private cellSizeAllZoom: number;
        private cellSizeMonthZoom: number;

        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.htmlElement = options.element;
            this.stateManager = new StateManager(this.host.createSelectionManager());
        }

        update(options: VisualUpdateOptions) {
            // update chosen cell color if needed
            const dataView = options.dataViews[0];
            if (dataView.metadata && dataView.metadata.objects) {
                // as defined in capabilities.json
                const cellColorObj: DataViewObject = dataView.metadata.objects['cellColor'];
                if (cellColorObj && cellColorObj['fill'])
                    this.cellColorTop = (cellColorObj['fill'] as Fill).solid.color;
            }

            // 
            // BUILD VIEW MODEL
            //
            const dataViews = options.dataViews;
            const viewModel: BetterCalendarViewModel = {
                dateValuesByYear: {} as { number: DateValue[] },
                yearsList: [],
                dateValueTable: {} as { string: DateValue },
                //eventOriginatedInVisual: false
            }

            if (!dataViews || !dataViews[0] || !dataViews[0].categorical
                || !dataViews[0].categorical.values || !dataViews[0].categorical.categories
                || !dataViews[0].categorical.categories[0].source) {
                // invalid dataViews
                return viewModel;
            }

            const dates: Date[] = dataViews[0].categorical.categories[0].values as Date[];
            const values: number[] = dataViews[0].categorical.values[0].values as number[];

            // build DateValue objects for each date in data
            let maxValue = 0;  // track min and max values for dates
            let minValue = 0;
            for (let i = 0; i < dates.length; i++) {
                // create DateValue out of date
                const selectionId: visuals.ISelectionId = this.host.createSelectionIdBuilder()
                    .withCategory(dataViews[0].categorical.categories[0], i)
                    .createSelectionId()
                const dateValue: DateValue = {
                    color: '',
                    date: dates[i],
                    value: values[i],
                    tooltipDataItems: [],
                    selectionId: selectionId
                };

                // index dateValue by year
                const year = dateValue.date.getFullYear();
                if (viewModel.dateValuesByYear[year] === undefined) {
                    viewModel.dateValuesByYear[year] = [] as DateValue[];
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
            const ratio = 1 / (maxValue - minValue);
            const r2 = parseInt(this.cellColorTop.substr(1, 2), 16);
            const g2 = parseInt(this.cellColorTop.substr(3, 2), 16);
            const b2 = parseInt(this.cellColorTop.substr(5, 2), 16);
            const r1 = parseInt(DEFAULT_CELL_COLOR_BOT.substr(1, 2), 16);
            const g1 = parseInt(DEFAULT_CELL_COLOR_BOT.substr(3, 2), 16);
            const b1 = parseInt(DEFAULT_CELL_COLOR_BOT.substr(5, 2), 16);
            for (let year in viewModel.dateValuesByYear) {  // iterating over keys (ie years)
                const dateValues: DateValue[] = viewModel.dateValuesByYear[year];
                for (let i = 0; i < dateValues.length; i++) {
                    const percent = (dateValues[i].value - minValue) * ratio;
                    const resultRed = Math.abs(r1 + percent * (r2 - r1));
                    const resultGreen = Math.abs(g1 + percent * (g2 - g1));
                    const resultBlue = Math.abs(b1 + percent * (b2 - b1));

                    const rgb = resultBlue | (resultGreen << 8) | (resultRed << 16);
                    dateValues[i].color = '#' + (0x1000000 + rgb).toString(16).slice(1);
                }
            }

            // build years list
            for (let year in viewModel.dateValuesByYear)
                viewModel.yearsList.push(parseInt(year));
            viewModel.yearsList.sort();

            //
            // RENDERING
            // 
            const currentZoomLevel = this.stateManager.getZoomLevel();
            if (currentZoomLevel === ZoomLevel.ALL)
                this.renderAllZoom(options, viewModel);
            else if (currentZoomLevel == ZoomLevel.MONTH)
                this.renderMonthZoom(options, viewModel);
        }

        /** This function gets called for each of the objects defined in the capabilities 
         * files and allows you to select which of the objects and properties you 
         * want to expose to the users in the property pane.
         * Objects and properties need to be defined in capabilities.json
         * For example, when you choose a color for the cells in paintroller menu, 
         * this will be called. */
        enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions)
            : VisualObjectInstance[] {
            const instances: VisualObjectInstance[] = [];
            switch (options.objectName) {
                case 'cellColor':
                    const cellColor = {
                        objectName: 'cellColor',
                        displayName: 'Cells color',
                        selector: null,
                        properties: {
                            // I think this updates the chosen cell color under the paint-roller menu
                            fill: this.cellColorTop
                        }
                    }
                    instances.push(cellColor);
                    break;
            }
            return instances;
        }

        /**********************************************************************
         *                             ALL ZOOM                               *
         **********************************************************************/
        private renderAllZoom(options: VisualUpdateOptions, viewModel: BetterCalendarViewModel) {
            if (viewModel.yearsList.length == 0)
                return;

            const startYear: number = viewModel.yearsList[0];
            const endYear: number = viewModel.yearsList[viewModel.yearsList.length - 1];

            // svg dimensions bound by viewport
            const numRowsOfMonths = 4;
            const widthTrim = 10;  // prevent float issue
            const svgWidth = (viewModel.yearsList.length === 1)
                ? options.viewport.width - widthTrim
                : options.viewport.width / 2 - widthTrim;

            // cell size, constrain it by the current width of the visual's viewport
            this.cellSizeAllZoom = ((svgWidth - 20) - (MONTH_VERTICAL_PAD_ALL_ZOOM * numRowsOfMonths)) /
                (NUM_DAYS_PER_WEEK * NUM_MONTHS_PER_ROW);

            const svgHeight = (numRowsOfMonths * (MAX_NUM_WEEKS_A_MONTH * this.cellSizeAllZoom + MONTH_HORIZONTAL_PAD_ALL_ZOOM))
                + TOP_PAD_ALL_ZOOM + 10;

            const body: d3.Selection<any> = d3.select(this.htmlElement);
            body.selectAll('svg').remove();

            const svgGroup: d3.Selection<number> = body.selectAll('svg')
                .data(d3.range(startYear, endYear + 1))
                .enter().append('svg')
                .classed('svgYear', true)
                .text((d) => { return d; })
                .attr('width', svgWidth)
                .attr('height', svgHeight);

            // render group container for each year
            const yearGroup = svgGroup.append('g')
                .classed('year', true)
                .attr('transform', 'translate(30,20)');  // offsets

            // year labels 
            yearGroup.append('text')
                .style('text-anchor', 'middle')
                .attr('font-size', 20)
                .text((year) => { return `${year}`; });

            // <g> for all months
            const monthGroup: d3.Selection<any> = yearGroup.selectAll('g')
                .data((year: number) => {
                    const months = [];
                    for (let i = Month.JAN; i <= Month.DEC; i++) {
                        const datum: { month: Month, year: number } = {
                            'month': i as Month,
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
                .attr('transform', (datum) => {
                    // set x,y offsets for each month <g>
                    const col = datum['month'] % 3;
                    const row = Math.floor(datum['month'] / 3);
                    const x = (col * this.cellSizeAllZoom * NUM_DAYS_PER_WEEK) + (col * MONTH_VERTICAL_PAD_ALL_ZOOM);
                    const y = (row * this.cellSizeAllZoom * MAX_NUM_WEEKS_A_MONTH) + (row * MONTH_HORIZONTAL_PAD_ALL_ZOOM) + TOP_PAD_ALL_ZOOM;
                    return `translate(${x}, ${y})`;
                });

            // labeling
            const dayY = '13';
            const monthFontSize = this.cellSizeAllZoom * 0.705
            const dayFontSize = this.cellSizeAllZoom * 0.5882
            // months
            var self = this;
            monthGroup.append('text')
                .text((datum) => { return `${Month[datum.month]} ${datum.year}`; })
                .attr('x', '30')
                .style('text-anchor', 'start')
                .attr('font-size', monthFontSize)
                .on('mouseover', function () { self.addMonthHoverStyling.call(this, self.cellColorTop); })
                .on('mouseout', this.removeMonthHoverStyling)
                .on('click', (datum: { month: Month, year: number }) => {
                    // GO TO MONTH ZOOM
                    this.stateManager.clearSelections();
                    this.stateManager.selectMonth(viewModel, datum.month, datum.year);
                    this.renderMonthZoom(options, viewModel);
                });
            // days
            const dayXCoordTable = this.getDayLabelXCoordTable(ZoomLevel.ALL, WEEK_FORMAT);
            for (let dayXCoord of dayXCoordTable) {
                monthGroup.append('text')
                    .text(dayXCoord[0])
                    .attr('x', dayXCoord[1]).attr('y', dayY)
                    .style('text-anchor', 'middle')
                    .attr('font-size', dayFontSize);
            }

            // <rect> cells for each day per month
            const rectGroup: d3.Selection<Date> = monthGroup
                .append('g')
                .classed('unselected', true)
                .selectAll('rect')
                .data((datum: { month: Month, year: number }) => {
                    const start = new Date(datum['year'], datum['month'], 1);
                    const end = new Date(datum['year'], datum['month'] + 1, 1);
                    return d3.time.days(start, end);
                })
                .enter().append('rect');

            // Add selected group   
            monthGroup.append('g')
                .classed('selected', true)

            this.renderDateRects(rectGroup, viewModel);

            this.renderBodyElement(viewModel);
        }

        /**********************************************************************
         *                             MONTH ZOOM                             *
         **********************************************************************/
        private renderMonthZoom(options: VisualUpdateOptions, viewModel: BetterCalendarViewModel) {
            if (viewModel.yearsList.length === 0)
                return;

            const selectedMonth: string = Month[this.stateManager.getSelectedMonth()];
            const selectedYear: number = this.stateManager.getSelectedYear();

            const svgWidth = options.viewport.width - 20;

            let calendarWidth = (svgWidth - LEFT_PAD_MONTH_ZOOM - RIGHT_PAD_MONTH_ZOOM);
            this.cellSizeMonthZoom = calendarWidth / NUM_DAYS_PER_WEEK;

            const svgHeight = this.cellSizeMonthZoom * MAX_NUM_WEEKS_A_MONTH + TOP_PAD_MONTH_ZOOM + 10;

            const body: d3.Selection<any> = d3.select(this.htmlElement);
            body.selectAll('svg').remove();

            const svgMonth: d3.Selection<number> = body.append('svg')
                .classed('svgMonth', true)
                .attr('width', svgWidth)
                .attr('height', svgHeight);

            // Create Marker definition and path for back button
            let monthFontSize = this.cellSizeMonthZoom / 2;
            let xAxisStart = 70;
            let xAxistEnd = 70;
            let yAxisStart = 60
            let yAxisEnd = yAxisStart - monthFontSize;
            var data = [{ id: 0, name: 'arrow', path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z', linePath: 'M ' + xAxisStart.toString() + ',' + yAxisStart.toString() + ' L ' + xAxistEnd.toString() + ',' + yAxisEnd.toString(), viewbox: '-5 -5 10 10' }];
            svgMonth.append('rect')
                .attr('x', 60).attr('y', yAxisEnd - 8).attr("width", 20).attr("height", yAxisStart - yAxisEnd + 8)
                .attr('fill', "white")
                .on('click', () => {
                    // go back to ALL zoom
                    this.stateManager.clearSelections();
                    this.stateManager.setAllZoom();
                    this.renderAllZoom(options, viewModel);
                });
            var defs = svgMonth.append("svg:defs");
            var paths = svgMonth.append('svg:g').attr('id', 'markers');
            var marker = defs.selectAll('marker')
                .data(data).enter()
                .append('svg:marker').attr('id', function (d) { return 'marker_' + d.name })
                .attr('markerHeight', 5).attr('markerWidth', 5).attr('markerUnits', 'strokeWidth').attr('orient', 'auto')
                .attr('refX', 0).attr('refY', 0)
                .attr('viewBox', function (d) { return d.viewbox })
                .append('svg:path')
                .attr('d', function (d) { return d.path })
                .attr('fill', Color[Color.GREY]);
            var path = paths.selectAll('path')
                .data(data).enter().append('svg:path')
                .attr('d', function (d) { return d.linePath })
                .attr('stroke', Color[Color.GREY])
                .attr('stroke-width', 3)
                .attr('stroke-linecap', 'round')
                .attr('marker-end', function (d, i) { return 'url(#marker_' + d.name + ')' })
                .on('click', () => {
                    // go back to ALL zoom
                    this.stateManager.clearSelections();
                    this.stateManager.setAllZoom();
                    this.renderAllZoom(options, viewModel);
                });

            // month and year label
            svgMonth.append('text')
                .style('text-anchor', 'start')
                .attr('font-size', this.cellSizeMonthZoom * .5)
                .attr('x', LEFT_PAD_MONTH_ZOOM + 70).attr('y', TOP_PAD_MONTH_ZOOM - 40)
                .attr('fill', Color[Color.GREY])
                .text(`${selectedMonth} ${selectedYear}`);
            // day labels
            const dayXCoordTable = this.getDayLabelXCoordTable(ZoomLevel.MONTH, WEEK_FORMAT);
            for (let dayXCoord of dayXCoordTable) {
                svgMonth.append('text')
                    .style('text-anchor', 'start')
                    .attr('font-size', this.cellSizeMonthZoom * .3)
                    .attr('x', dayXCoord[1]).attr('y', TOP_PAD_MONTH_ZOOM - 10)
                    .attr('fill', Color[Color.GREY])
                    .text(dayXCoord[0]);
            }

            //
            // rects for days
            //
            const dates = this.stateManager.getDaysInMonthBySelectedMonth(this.stateManager.getSelectedMonth(), selectedYear, viewModel);
            const datesOfMonthSelected: Date[] = dates.selectedDays;
            const datesOfMonth: Date[] = dates.unselectedDays;
            const month: number = this.stateManager.getSelectedMonth();

            const unselectedGroup = svgMonth.append('g')
                .classed('unselected', true);

            const selectedGroup = svgMonth.append('g')
                .classed('selected', true);

            const unselectedRectGroup: d3.Selection<Date> = unselectedGroup.selectAll('rect')
                .data(datesOfMonth)
                .enter().append('rect');

            this.renderDateRects(unselectedRectGroup, viewModel);

            const selectedRectGroup: d3.Selection<Date> = selectedGroup.selectAll('rect')
                .data(datesOfMonthSelected)
                .enter().append('rect');

            this.renderDateRects(selectedRectGroup, viewModel);

            // show dates for sundays
            // date box
            const allDatesOfMonth: Date[] = datesOfMonth.concat(datesOfMonthSelected);

            const strokeWidth = STROKE_WIDTH_MONTH_ZOOM;
            const strokeModifier = calendarWidth * .008;
            const dateBoxSize = ((strokeWidth - 1) * strokeModifier) * 2;
            const zoomLevel: ZoomLevel = this.stateManager.getZoomLevel();

            svgMonth.selectAll('g g')
                .data(allDatesOfMonth.filter((date: Date) => {
                    return date.getDay() === 0;
                }))
                .enter().append('rect')
                .attr('width', dateBoxSize)
                .attr('height', dateBoxSize)
                .attr('x', (date: Date) => {
                    const rectX = this.setXCoordinateOfDay(date, zoomLevel);
                    return rectX + this.cellSizeMonthZoom - (dateBoxSize);
                })
                .attr('y', (date: Date) => {
                    return this.setYCoordinateOfDay(date, zoomLevel);
                })
                .attr('fill', (date: Date) => {
                    const dateValue: DateValue = viewModel.dateValueTable[date.toString()];
                    return (dateValue) ? dateValue.color : Color[Color.WHITE];
                })
                .attr('stroke', (date: Date) => {
                    return DATE_UNSELECTED_COLOR;
                })
                .attr('stroke-width', `${strokeWidth}px`)
            // date number
            svgMonth.selectAll('g g')
                .data(allDatesOfMonth.filter((date: Date) => {
                    return date.getDay() === 0;
                }))
                .enter().append('text')
                .style('text-anchor', 'end')
                .attr('font-size', this.cellSizeMonthZoom * .2)
                .attr('fill', Color[Color.GREY])
                .attr('x', (date: Date) => {
                    const rectX = this.setXCoordinateOfDay(date, zoomLevel);
                    return rectX + this.cellSizeMonthZoom - ((strokeWidth - 2.85) * strokeModifier);
                })
                .attr('y', (date: Date) => {
                    const rectY = this.setYCoordinateOfDay(date, zoomLevel);
                    return rectY + ((strokeWidth) * strokeModifier);
                })
                .text((date: Date) => {
                    return date.getDate();
                });

            this.renderBodyElement(viewModel);
        }

        private renderDateRects(rectGroup: d3.Selection<Date>, viewModel: BetterCalendarViewModel) {
            const zoomLevel = this.stateManager.getZoomLevel();
            let strokeWidth: ZoomLevel;
            let cellSize: number;
            if (zoomLevel === ZoomLevel.ALL) {
                strokeWidth = STROKE_WIDTH_ALL_ZOOM;
                cellSize = this.cellSizeAllZoom;
            } else if (zoomLevel === ZoomLevel.MONTH) {
                strokeWidth = STROKE_WIDTH_MONTH_ZOOM;
                cellSize = this.cellSizeMonthZoom;
            } else {
                strokeWidth = 1;
                cellSize = this.cellSizeAllZoom;
            }

            rectGroup.classed('day', true)
                .attr("width", cellSize)
                .attr("height", cellSize)

                // positioning
                .attr("x", (date: Date) => {
                    return this.setXCoordinateOfDay(date, zoomLevel);
                })
                .attr("y", (date: Date) => {
                    return this.setYCoordinateOfDay(date, zoomLevel);
                })

                // rect attributes
                .attr('fill', (date: Date) => {
                    const dateValue: DateValue = viewModel.dateValueTable[date.toString()];
                    return (dateValue) ? dateValue.color : Color[Color.WHITE];
                })
                .attr('stroke', (date: Date) => {
                    const isSelected = this.stateManager.isDateSelected(date, viewModel);
                    return (isSelected) ? DATE_SELECTED_COLOR : DATE_UNSELECTED_COLOR;
                })
                .attr('stroke-width', `${strokeWidth}px`)

                // storing rect selection to corresponding dateValue
                .each((date: Date, j: number, i: number) => {
                    const dateValue: DateValue = viewModel.dateValueTable[date.toString()];
                    if (dateValue) {
                        assert(rectGroup !== undefined, 'error: rectgroup is undefined');
                        assert(rectGroup[i] !== undefined, `error: rectgroup[${i}] is undefined`);
                        assert(rectGroup[i][j] !== undefined, `error: rectgroup[${i}][${j}] is undefined`);
                        const rect: d3.Selection<Date> = d3.select(rectGroup[i][j]);
                        assert(rect !== undefined, 'error: selecting it is undefined');
                    }
                })

                // rect behavior
                .on('mouseover.tooltip', (date: Date) => {
                    this.renderTooltip(date, viewModel, false);
                })
                .on('mousemove.tooltip', (date: Date) => {
                    this.renderTooltip(date, viewModel, true);
                })
                .on('mouseout.tooltip', (date: Date) => {
                    this.host.tooltipService.hide({
                        isTouchEvent: false,
                        immediately: false
                    } as TooltipHideOptions);
                });

            // handle single/multi selections
            rectGroup.on('mousedown', (date: Date) => {
                const mouseEvent = d3.event as MouseEvent;
                const dateValue: DateValue = viewModel.dateValueTable[date.toString()];
                if (!mouseEvent.shiftKey && !mouseEvent.ctrlKey) {
                    if (this.stateManager.activeSelectionCount() == 1 && this.stateManager.isDateSelected(date, viewModel)) {
                        this.stateManager.unSelect(date, viewModel);
                    } else {
                        this.stateManager.clearSelections();
                        this.stateManager.select(dateValue, KeyMod.NONE, viewModel);
                    }

                    // clicking outside of month in month zoom should change back to month selection
                    const dateInData = this.stateManager.isDateInData(dateValue);
                    if (!dateInData && this.stateManager.getZoomLevel() === ZoomLevel.MONTH)
                        this.stateManager.selectMonth(viewModel);
                } else if (mouseEvent.shiftKey) {
                    this.stateManager.clearSelections();
                    this.stateManager.select(dateValue, KeyMod.SHIFT, viewModel);
                } else if (mouseEvent.ctrlKey) {
                    if (this.stateManager.isDateSelected(date, viewModel))
                        this.stateManager.unSelect(date, viewModel);
                    else
                        this.stateManager.select(dateValue, KeyMod.CTRL, viewModel);
                }
                this.reorderDaysBySelection(viewModel);
            });
        }

        private reorderDaysBySelection(viewModel: BetterCalendarViewModel) {
            var svgMonthSelection: d3.Selection<any>;
            switch (this.stateManager.getZoomLevel()) {
                case ZoomLevel.ALL:
                    svgMonthSelection = d3.select(this.htmlElement).selectAll('svg g.year g.month');
                    for (var i = 0; i < viewModel.yearsList.length; i++) {
                        for (var j = 0; j < 12; j++) {
                            var month = svgMonthSelection.filter(function (n) {
                                return j === n.month && viewModel.yearsList[i] === n.year;
                            })
                            if (month.length > 0) {
                                const dates = this.stateManager.getDaysInMonthBySelectedMonth(j, viewModel.yearsList[i], viewModel);
                                this.reorderDaysByMonth(month, dates, viewModel);
                            }
                        }
                    }
                    break;
                case ZoomLevel.MONTH:
                    const dates = this.stateManager.getDaysInMonthBySelectedMonth(this.stateManager.getSelectedMonth(), this.stateManager.getSelectedYear(), viewModel);
                    svgMonthSelection = d3.select('svg.svgMonth');
                    this.reorderDaysByMonth(svgMonthSelection, dates, viewModel);
                    break;
            }
        }

        private reorderDaysByMonth(svgMonth: d3.Selection<any>, dates: { unselectedDays: Date[], selectedDays: Date[] }, viewModel: BetterCalendarViewModel) {
           
            const addToSelected: d3.Selection<Date> = removeChangedDays(svgMonth.selectAll('g.unselected rect'), dates.unselectedDays);
            const addToUnselected: d3.Selection<Date> = removeChangedDays(svgMonth.selectAll('g.selected rect'), dates.selectedDays);
            
            addChangedDays(addToSelected, svgMonth.selectAll('g.selected'));
            addChangedDays(addToUnselected, svgMonth.selectAll('g.unselected'));

            renderDayStroke(svgMonth.selectAll('g.unselected rect'), DATE_UNSELECTED_COLOR);
            renderDayStroke(svgMonth.selectAll('g.selected rect'), DATE_SELECTED_COLOR);

            function removeChangedDays(monthSelection: d3.Selection<Date>, baseDateArr: Date[]): d3.Selection<Date> {
                return monthSelection.filter(function (datum: any, index: number, outerIndex: number) {
                    return baseDateArr.map(function (n) { return n.valueOf(); }).indexOf(datum.valueOf()) == -1;
                }).remove();
            }

            function addChangedDays(changedSelection: d3.Selection<Date>, destinationSelection: d3.Selection<Date>) {
                changedSelection[0].forEach(function (n) {
                    var date = getDataFromElement(n);
                    destinationSelection
                        .append(function () { return n; })
                        .data([date])
                        .enter()
                });
            }

            function renderDayStroke(selection: d3.Selection<Date>, stroke: string) {
                selection.attr('stroke', stroke);
            }

            function getDataFromElement(elem): Date {
                return elem.__data__;
            }
        }
        
        private renderBodyElement(viewModel: BetterCalendarViewModel) {
            // setting up body element
            const body: d3.Selection<any> = d3.select(this.htmlElement);
            const rectGroup: d3.Selection<Date> = body.selectAll('rect');
            body.style('overflow', 'auto');
            body.on('mousedown', () => {
                const mouseEvent = d3.event as MouseEvent;
                // body ALSO hit if date already selected and clicked again with modifier
                if (!mouseEvent.ctrlKey && !mouseEvent.shiftKey) {
                    const reRender: boolean = this.stateManager.hasActiveSelection();
                    this.stateManager.clearSelections();
                    this.stateManager.setAnchor(null);
                    if (this.stateManager.getZoomLevel() === ZoomLevel.MONTH)
                        this.stateManager.selectMonth(viewModel);
                    if (reRender) {
                        this.reorderDaysBySelection(viewModel);
                    }
                }
            });
            // render individual day selection on update
            this.reorderDaysBySelection(viewModel);
        }

        private setXCoordinateOfDay(date: Date, zoomLevel: ZoomLevel): number {
            let day = date.getDay();
            if (WEEK_FORMAT === WeekFormat.MON_SUN) {
                // Date object gives Sunday as 0, but we need it as 6
                day = (day === 0) ? Day.SUN : day - 1;
            }

            if (zoomLevel === ZoomLevel.ALL)
                return day * this.cellSizeAllZoom;
            else if (zoomLevel === ZoomLevel.MONTH)
                return day * this.cellSizeMonthZoom + LEFT_PAD_MONTH_ZOOM;
        }

        private setYCoordinateOfDay(date: Date, zoomLevel: ZoomLevel): number {
            let firstDayOfWeekInMonth = d3.time.month.floor(date).getDay();
            if (WEEK_FORMAT === WeekFormat.MON_SUN) {
                // We need Sunday as 6 instead of 0
                firstDayOfWeekInMonth = (firstDayOfWeekInMonth === 0)
                    ? Day.SUN : firstDayOfWeekInMonth - 1;
            }

            const offset = firstDayOfWeekInMonth - 1;
            const weekOfMonth = Math.floor((date.getDate() + offset) / NUM_DAYS_PER_WEEK);
            if (zoomLevel === ZoomLevel.ALL)
                return weekOfMonth * this.cellSizeAllZoom + TOP_PAD_DATES_ALL_ZOOM;
            else if (zoomLevel === ZoomLevel.MONTH)
                return weekOfMonth * this.cellSizeMonthZoom + TOP_PAD_MONTH_ZOOM;
        }

        private getDayLabelXCoordTable(zoomLevel: ZoomLevel, weekFormat: WeekFormat): (string | number)[][] {
            let cellSize, offset;
            if (zoomLevel === ZoomLevel.ALL) {
                cellSize = this.cellSizeAllZoom;
                offset = 10;
            } else if (zoomLevel === ZoomLevel.MONTH) {
                cellSize = this.cellSizeMonthZoom;
                offset = LEFT_PAD_MONTH_ZOOM + 20;
            }

            const dayXCoordTable: (string | number)[][] = [
                ['Su', 0 * cellSize + offset],
                ['Mo', 1 * cellSize + offset],
                ['Tu', 2 * cellSize + offset],
                ['We', 3 * cellSize + offset],
                ['Th', 4 * cellSize + offset],
                ['Fr', 5 * cellSize + offset],
                ['Sa', 6 * cellSize + offset]
            ];

            if (weekFormat === WeekFormat.MON_SUN) {
                // Move Sunday to the end of the list and redo offsets
                dayXCoordTable.push(dayXCoordTable.shift());
                for (let i = 0; i < NUM_DAYS_PER_WEEK; i++)
                    dayXCoordTable[i][1] = i * cellSize + offset;
            }

            return dayXCoordTable;
        }

        private renderTooltip(date: Date, viewModel: BetterCalendarViewModel, isMoving: boolean) {
            // can display tooltip if mouse button is not pressed
            const mouseEvent: MouseEvent = d3.event as MouseEvent;
            let canDisplayTooltip: boolean = true;
            if (mouseEvent.buttons !== undefined)
                canDisplayTooltip = (mouseEvent.buttons === 0);

            // also don't ignore mouse events immediately after touch end
            canDisplayTooltip = canDisplayTooltip && (this.touchTimeoutId == null || this.touchTimeoutId == undefined);
            if (!canDisplayTooltip)
                return;

            const isPointerEvent = window['PointerEvent'] as boolean;

            // dates without corresponding data will not be in dateValueTable
            let dateValue: DateValue = viewModel.dateValueTable[date.toString()];
            let dataItems: VisualTooltipDataItem[];
            if (dateValue !== undefined) {
                dataItems = dateValue.tooltipDataItems;
            } else {
                dataItems = [{
                    displayName: d3.time.format('%Y-%m-%d')(new Date(date)),
                    value: '0',
                    color: null,
                    header: null
                }];
            }

            const tooltipOptions = {
                coordinates: this.getMouseCoordinates(this.htmlElement, isPointerEvent),
                isTouchEvent: false,
                dataItems: dataItems,
                identities: []  // TODO something to do with selectionId? now hardcoded empty
            };

            if (isMoving)
                this.host.tooltipService.move(tooltipOptions as TooltipMoveOptions);
            else
                this.host.tooltipService.show(tooltipOptions as TooltipShowOptions);
        }

        private getMouseCoordinates(element: Element, isPointerEvent: boolean): number[] {
            let coordinates: number[];

            if (isPointerEvent) {
                // copied from d3_eventSource (which is not exposed)
                let e = d3.event as any;
                let s;
                while (s = e.sourceEvent) {
                    e = s;
                }
                const rect = element.getBoundingClientRect();
                coordinates = [
                    e.clientX - rect.left - element.clientLeft,
                    e.clientY - rect.top - element.clientTop
                ];
            } else {
                const touchCoordinates = d3.touches(element);
                if (touchCoordinates && touchCoordinates.length > 0) {
                    coordinates = touchCoordinates[0];
                }
            }

            return coordinates;
        }

        // Event Callbacks for Link/View Navigation Styling
        private addMonthHoverStyling(color: string, textElem?: Element) {
            textElem = textElem && textElem instanceof Element ? textElem : (this as any);
            textElem.setAttribute('stroke', color);
            textElem.setAttribute('fill', color);
        }

        private removeMonthHoverStyling(textElem?: Element) {
            textElem = textElem && textElem instanceof Element ? textElem : (this as any);
            textElem.removeAttribute('stroke');
            textElem.removeAttribute('fill');
        }
    }
}