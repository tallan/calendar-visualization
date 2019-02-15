module powerbi.extensibility.visual {
    /**Creates views for individual zoom levels and drilldowns */
    export class ViewManager {
        private element: HTMLElement;
        public calendarSVG: d3.Selection<SVGElement>;
        public calendarContainerGroup: d3.Selection<SVGElement>;
        private landingPage: d3.Selection<HTMLImageElement>;
        public viewModel: CalendarViewModel;
        public layoutConfig: LayoutConfiguration;
        public yearViewLayout: YearViewLayoutConfiguration;
        public tooltipServiceWrapper: ITooltipServiceWrapper;
        public stateManager: StateManager;
        public options: VisualUpdateOptions;
        private isLandingPageOn: boolean;


        constructor(tooltipServiceWrapper: ITooltipServiceWrapper, stateManager: StateManager, options: VisualConstructorOptions) {
            this.element = options.element;
            this.calendarSVG = d3.select(this.element)
                .append('svg')
                .classed('calendarSVG', true);
            this.tooltipServiceWrapper = tooltipServiceWrapper;
            this.stateManager = stateManager;
        }

        /**
         * Renders the current calender view
         * @method
         * @param {VisualUpdateOptions} options -Contains references to the size of the container and the dataView which contains
         *                                      all the data the visual had queried
         * @param {CalendarViewModel} viewModel -view model for the calendar visual 
         * @param selectionManager 
         */
        renderCalendar(options: VisualUpdateOptions, viewModel: CalendarViewModel) {
            this.calendarSVG.remove();
            this.viewModel = viewModel;
            this.options = options;
            let currentZoomLevel = this.stateManager.getZoomLevel();
            this.layoutConfig = new LayoutConfiguration(options, viewModel, currentZoomLevel);
            if (this.viewModel.isLandingPage) {
                if (!this.isLandingPageOn || options.dataViews[0].metadata.columns.length >= 3) {
                    this.isLandingPageOn = true;
                    this.landingPage = d3.select(this.element)
                        .append('img')
                        .classed('logo', true)
                        .attr('src', 'https://az158878.vo.msecnd.net/marketing/Partner_21474846645/Product_42949681214/Asset_dbf7b83c-c0dc-4293-88c2-11bbc2f5dad5/CalendarVisualizationLogo300x3.png')
                        .attr('width', '100%')
                        .attr('height', 'auto')
                        .attr('object-fit', 'contain');
                }
            }
            else {
                
                if (this.isLandingPageOn && !this.viewModel.isLandingPage) {
                    this.isLandingPageOn = false;
                    this.landingPage.remove();
                }
                if (!this.isLandingPageOn && !this.viewModel.isLandingPage) {
                    this.calendarSVG = d3.select(this.element)
                        .append('svg')
                        .classed('calendarSVG', true);
                    this.calendarContainerGroup = this.calendarSVG.append('g')
                        .classed('calendarContainer', true);

                    if (viewModel.drillDownInfo.isDrillDown) {
                        this.yearViewLayout = new YearViewLayoutConfiguration(options.viewport.width, options.viewport.height, viewModel.configurations, viewModel.drillDownDataPoints.length);
                        this.renderDrillDownView();
                    }
                    else {
                        if (currentZoomLevel === ZoomLevel.ALL) {
                            this.renderAllZoom();
                        }
                        else if (currentZoomLevel == ZoomLevel.MONTH) {
                            this.renderMonthZoom(this.stateManager.getSelectedMonth(), this.stateManager.getSelectedYear());
                        }
                        
                    }
                    // Select all rects with selected-rect class
                    d3.selectAll('.selected-rect').attr({ 'stroke': DATE_SELECTED_COLOR })
                    .each(function () {
                        // Move selection to front
                        this.parentNode.appendChild(this);
                    });
                }
            }

        }

        /**
         * Renders a zoom level "ALL", which displays all months included in the current calendar visual
         * @method @private
         */
        private renderAllZoom() {
            if (this.viewModel.dataPoints.length == 0) {
                return;
            }
            // Clear SVG
            d3.selectAll('.calendarContainer').remove();
            let svg = this.calendarSVG;
            this.calendarContainerGroup = svg.append('g').classed('calendarContainer', true);

            let scrollDirection = this.viewModel.configurations.scrollDirection;
            let numberOfMonths: number = this.layoutConfig.numberOfMonths;
            this.layoutConfig = new LayoutConfiguration(this.options, this.viewModel, ZoomLevel.ALL)
            let actualNumberOfColumns = this.layoutConfig.numberOfColumns;
            let actualNumberOfRows = this.layoutConfig.numberOfRows;
            // Render Calendar Month
            let iterateMonth = this.viewModel.minimumDate.getMonth();
            let iterateYear = this.viewModel.minimumDate.getFullYear();
            let endMonth = this.viewModel.maximumDate.getMonth();
            let endYear = this.viewModel.maximumDate.getFullYear();
            let endLoopMonth = endMonth + 1 != 12 ? endMonth + 1 : 0;
            let endLoopYear = endLoopMonth != 0 ? endYear : endYear + 1;
            let monthIndex = 0;
            let continueMonths: boolean = true;
            // Get Size of SVG
            this.calendarSVG.attr({
                width: this.layoutConfig.svgWidth,
                height: this.layoutConfig.svgHeight
            });
            while (continueMonths) {
                monthIndex = monthIndex + 1;
                // Get data points for the month
                let monthDataPoints = this.viewModel.dataPoints.filter(function (obj) {
                    return obj.month === iterateMonth && obj.year == iterateYear;
                });
                let columnNumber = getColumnNumber(monthIndex, numberOfMonths, actualNumberOfColumns, actualNumberOfRows, scrollDirection);
                let rowNumber = getRowNumber(monthIndex, numberOfMonths, actualNumberOfColumns, actualNumberOfRows, scrollDirection);
                this.renderMonth(monthDataPoints, iterateMonth, iterateYear, monthIndex, columnNumber, rowNumber);
                iterateMonth = iterateMonth + 1 != 12 ? iterateMonth + 1 : 0;
                iterateYear = iterateMonth != 0 ? iterateYear : iterateYear + 1;
                if (iterateMonth == endLoopMonth && iterateYear == endLoopYear) {
                    continueMonths = false;
                }
            }

            this.stateManager.addSelections(this.calendarContainerGroup, this.viewModel);
            this.tooltipServiceWrapper.addTooltip(this.calendarContainerGroup.selectAll('.day'),
                (tooltipEvent: TooltipEventArgs<CalendarDataPoint>) => getTooltipData(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<CalendarDataPoint>) => tooltipEvent.data.selectionId);
        }

        /**
         * renders an in individual month for the all zoom view
         * @method @private
         * @param {CalendarDataPoint[]} dataPoints  -all datapoints for selected month
         * @param {number} monthNumber              -number of selected month
         * @param {number} yearNumber               -number of selected year
         * @param {number} monthIndex               -index of selected month
         * @param {number} columnNumber             -column number of month in all view   
         * @param {number} rowNumber                -row number of month in all view
         */
        private renderMonth(dataPoints: CalendarDataPoint[], monthNumber: number, yearNumber: number, monthIndex: number, columnNumber: number, rowNumber: number) {
            let monthLabel = Month[monthNumber] + ' ' + yearNumber;
            let selections = this.stateManager.getSelectionIds();
            let monthHorizontalOffset = columnNumber == 1 ? this.layoutConfig.horizontalMonthPadding : (this.layoutConfig.calendarDateRectSize * 7 * (columnNumber - 1)) + (this.layoutConfig.horizontalMonthPadding * columnNumber); // Considers size of calendar, and padding between months;
            let monthVerticalOffset = rowNumber == 1 ? this.layoutConfig.verticalMonthPadding : (this.layoutConfig.calendarDateRectSize * 7 * (rowNumber - 1)) + (20 * rowNumber) + this.layoutConfig.verticalMonthPadding;
            let self = this;
            // Render Month Label
            this.calendarContainerGroup.append('text')
                .style('text-anchor', 'start')
                .attr('font-size', this.layoutConfig.calendarDateRectSize)
                .attr('x', monthHorizontalOffset).attr('y', monthVerticalOffset)
                .attr('fill', Color[Color.GREY])
                .text(monthLabel)
                .attr('font-family', this.viewModel.configurations.font)
                .on('mouseover', function () { addMonthHoverStyling.call(this, (self.viewModel.configurations.dataPoint.solid.color as string)); })
                .on('mouseout', removeMonthHoverStyling)
                .on('click', function () {
                    // GO TO MONTH ZOOM
                    self.clearVisualSelections();
                    self.stateManager.setMonthZoom(ZoomLevel.MONTH, monthNumber, yearNumber);
                    self.stateManager.selectMonth(self.viewModel, monthNumber, yearNumber);
                    self.renderMonthZoom(monthNumber, yearNumber);
                });

            // Render Day labels            
            for (let dayLabel of this.viewModel.dayIndexingArray) {
                let dayLabelConfig: DayConfiguation = dayLabel;
                this.calendarContainerGroup.append('text')
                    .style('text-anchor', 'start')
                    .attr('font-size', self.layoutConfig.calendarDateRectSize * self.layoutConfig.monthTitleRatio)
                    .attr('x', (dayLabelConfig.configuredDayIndex * self.layoutConfig.calendarDateRectSize) + monthHorizontalOffset)
                    .attr('y', monthVerticalOffset + 15)
                    .attr('fill', Color[Color.GREY])
                    .text(dayLabel.dayLabel)
                    .attr('font-family', this.viewModel.configurations.font);
            }

            let dayRects = this.calendarContainerGroup.selectAll('.day' + monthIndex).data(dataPoints);
            dayRects.enter().append('rect')
                .attr("width", this.layoutConfig.calendarDateRectSize)
                .attr("height", this.layoutConfig.calendarDateRectSize)
                .attr("x", (data: CalendarDataPoint) => {
                    return this.setXCoordinateOfDay(data.date, monthHorizontalOffset, ZoomLevel.ALL, this.viewModel.dayIndexingArray);
                })
                .attr("y", (data: CalendarDataPoint) => {
                    return this.setYCoordinateOfDay(data.date, monthVerticalOffset, ZoomLevel.ALL, this.viewModel.configurations.weekStartDay, this.viewModel.dayIndexingArray);
                })
                .attr('fill', (data: CalendarDataPoint) => {
                    return data.color;
                })
                .attr('stroke', (data: CalendarDataPoint) => {
                    return DATE_UNSELECTED_COLOR; // TODO
                })
                .attr('class', (data: CalendarDataPoint) => {
                    let isSelected = false;
                    if (data.selectionId != null) {
                        for (var i = 0; i < selections.length; i++) {
                            if (selections[i]["key"] == data.selectionId.getKey()) {
                                isSelected = true;
                            }
                        }
                    }
                    return isSelected ? ' day selected-rect' : 'day';
                })
                .attr('stroke-width', `2px`);

            dayRects.exit().remove();
        }

        /**
         * Renders a zoom level "MONTH", which displays a selected month in the current calendar visual
         * @method
         * @param {number} monthNumber          -number representing current month
         * @param {number} yearNumber           -number representing current year
         */
        public renderMonthZoom(monthNumber: number, yearNumber: number) {
            // Clear SVG
            d3.selectAll('.calendarContainer').remove();
            let svg = this.calendarSVG;
            this.calendarContainerGroup = svg.append('g').classed('calendarContainer', true);

            this.layoutConfig = new LayoutConfiguration(this.options, this.viewModel, ZoomLevel.MONTH);

            // Get Size of SVG
            this.calendarSVG.attr({
                width: this.layoutConfig.svgWidth,
                height: this.layoutConfig.svgHeight
            });
            const selectedMonth: string = Month[monthNumber];
            const selectedYear: number = yearNumber;
            let self = this;

            // Create Marker definition and path for back button
            let monthFontSize = this.layoutConfig.calendarDateRectSize / 2;
            let xAxisStart = 70;
            let xAxistEnd = 70;
            let yAxisStart = 60
            let yAxisEnd = yAxisStart - monthFontSize;
            var data = [{ id: 0, name: 'arrow', path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z', linePath: 'M ' + xAxisStart.toString() + ',' + yAxisStart.toString() + ' L ' + xAxistEnd.toString() + ',' + yAxisEnd.toString(), viewbox: '-5 -5 10 10' }];
            this.calendarContainerGroup.append('rect').classed('allZoomButton', true)
                .attr('x', 60).attr('y', yAxisEnd - 8)
                .attr("width", 20)
                .attr("height", yAxisStart - yAxisEnd + 8)
                .attr('fill', "white")
                .on('click', () => {
                    // Zoom out to all
                    this.clearVisualSelections();
                    self.stateManager.setAllZoom();
                    self.renderAllZoom(); // TODO - KC
                });
            var defs = this.calendarContainerGroup.append("svg:defs");
            var paths = this.calendarContainerGroup.append('svg:g').attr('id', 'markers');
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
                    // Zoom out to all
                    this.clearVisualSelections();
                    self.stateManager.setAllZoom();
                    self.renderAllZoom();
                });
            // Month and Year Label
            this.calendarContainerGroup.append('text')
                .style('text-anchor', 'start')
                .attr('font-size', this.layoutConfig.calendarDateRectSize * this.layoutConfig.monthTitleRatio)
                .attr('x', LEFT_PAD_MONTH_ZOOM + 70).attr('y', TOP_PAD_MONTH_ZOOM - 40)
                .attr('fill', Color[Color.GREY])
                .text(`${selectedMonth} ${selectedYear}`)
                .attr('font-family', this.viewModel.configurations.font);
            // Render Day labels            
            for (let dayLabel of this.viewModel.dayIndexingArray) {
                let dayLabelConfig: DayConfiguation = dayLabel;
                this.calendarContainerGroup.append('text')
                    .style('text-anchor', 'start')
                    .attr('font-size', this.layoutConfig.calendarDateRectSize * this.layoutConfig.monthTitleRatio)
                    .attr('x', (dayLabelConfig.configuredDayIndex * this.layoutConfig.calendarDateRectSize) + 50).attr('y', 100)
                    .attr('fill', Color[Color.GREY])
                    .text(dayLabel.dayLabel)
                    .attr('font-family', this.viewModel.configurations.font);
            }

            let monthDataPoints: CalendarDataPoint[] = _.filter(this.viewModel.dataPoints, function (dataPoint) { return dataPoint.month == monthNumber && dataPoint.year == yearNumber; });

            let dayRects = this.calendarContainerGroup.selectAll('.day').data(monthDataPoints);
            dayRects.enter().append('rect').classed('day', true)
                .attr("width", this.layoutConfig.calendarDateRectSize)
                .attr("height", this.layoutConfig.calendarDateRectSize)
                .attr("x", (data: CalendarDataPoint) => { return this.setXCoordinateOfDay(data.date, 50, ZoomLevel.ALL, this.viewModel.dayIndexingArray); })
                .attr("y", (data: CalendarDataPoint) => { return this.setYCoordinateOfDay(data.date, 100, ZoomLevel.ALL, this.viewModel.configurations.weekStartDay, this.viewModel.dayIndexingArray); })
                .attr('fill', (data: CalendarDataPoint) => { return data.color; })
                .attr('stroke', (data: CalendarDataPoint) => { return DATE_UNSELECTED_COLOR; }) //TODO
                .attr('stroke-width', `2px`);

            dayRects.exit().remove();

            // Show dates for start of week
            // date box
            const datesOfMonth: Date[] = [];
            for (let dp of monthDataPoints) {
                datesOfMonth.push(dp.date);
            }

            this.calendarContainerGroup.selectAll('.dayNumberBox')
                .data(datesOfMonth.filter((date: Date) => { return date.getDay() === self.viewModel.configurations.weekStartDay; }))
                .enter().append('rect').classed("dayNumberBox", true)
                .attr('width', 18)
                .attr('height', 18)
                .attr('x', (date: Date) => {
                    const rectX = this.setXCoordinateOfDay(date, 50, ZoomLevel.MONTH, self.viewModel.dayIndexingArray);
                    return rectX - 13;
                })
                .attr('y', (date: Date) => {
                    const rectY = this.setYCoordinateOfDay(date, 100, ZoomLevel.MONTH, self.viewModel.configurations.weekStartDay, self.viewModel.dayIndexingArray);;
                    return rectY - 15;
                })
                .attr('fill', (date: Date) => { return Color[Color.WHITE]; })
                .attr('stroke', (date: Date) => { return DATE_UNSELECTED_COLOR; })
                .attr('stroke-width', `2px`)
            // Date Number
            let dayNumberText = this.calendarContainerGroup.selectAll('.dayNumber')
                .data(datesOfMonth.filter((date: Date) => { return date.getDay() === self.viewModel.configurations.weekStartDay; }));
            dayNumberText.enter().append('text').classed('dayNumber', true)
                .style('text-anchor', 'end')
                .attr('font-size', 12)
                .attr('fill', Color[Color.GREY])
                .attr('x', (date: Date) => {
                    const rectX = this.setXCoordinateOfDay(date, 50, ZoomLevel.MONTH, self.viewModel.dayIndexingArray);
                    return rectX + 3;
                })
                .attr('y', (date: Date) => {
                    const rectY = this.setYCoordinateOfDay(date, 100, ZoomLevel.MONTH, self.viewModel.configurations.weekStartDay, self.viewModel.dayIndexingArray);;
                    return rectY;
                })
                .text((date: Date) => { return date.getDate(); })
                .attr('font-family', this.viewModel.configurations.font);

            this.stateManager.addSelections(this.calendarContainerGroup, this.viewModel);
            this.tooltipServiceWrapper.addTooltip(this.calendarContainerGroup.selectAll('.day'),
                (tooltipEvent: TooltipEventArgs<CalendarDataPoint>) => getTooltipData(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<CalendarDataPoint>) => tooltipEvent.data.selectionId);
        }

        /**
         * Creates a view for each drill down level.
         * @method
         */
        public renderDrillDownView() {
            // Clear SVG
            d3.selectAll('.calendarContainer').remove();
            let svg = this.calendarSVG;
            this.calendarContainerGroup = svg.append('g')
                .classed('calendarContainer', true);
            this.yearViewLayout;

            // Get Size of SVG
            this.calendarSVG.attr({
                width: this.yearViewLayout.svgWidth,
                height: this.yearViewLayout.svgHeight
            });
            let self = this;
            let dataPoints = this.viewModel.drillDownDataPoints;
            let numberOfBoxes = dataPoints.length;
            let numberOfRows = this.yearViewLayout.numberOfRows;
            let numberOfColumns = this.yearViewLayout.numberOfColumns;
            let rectWidth = this.yearViewLayout.yearRectSize;
            let padding = this.yearViewLayout.svgPadding;
            let dataPointRects = this.calendarContainerGroup.selectAll('.calendarPoint').data(dataPoints);
            dataPointRects.enter().append('rect').classed('calendarPoint', true)
                .attr("width", rectWidth)
                .attr("height", rectWidth)
                .attr("x", (data: DateDataPoint) => {
                    let columnNumber = getColumnNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                    let offset = columnNumber - 1;
                    return (self.yearViewLayout.yearRectSize * (columnNumber - 1)) + padding;
                })
                .attr("y", (data: DateDataPoint) => {
                    let rowNumber = getRowNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                    return (self.yearViewLayout.yearRectSize * (rowNumber - 1)) + padding;
                })
                .attr('fill', (data: DateDataPoint) => {
                    return data.color;
                })
                .attr('stroke', (data: DateDataPoint) => {
                    return DATE_UNSELECTED_COLOR; // TODO
                })
                .attr('stroke-width', `2px`);
            dataPointRects.exit().remove();
            dataPointRects.enter().append('text').classed('calendarPointLabel', true)
                .each(function (data) {
                    let categoryLabels = data.label.split(" ");
                    var indexOfQuarter = categoryLabels.indexOf("Qtr");
                    if (indexOfQuarter != -1) {
                        let quarterNumber = categoryLabels[indexOfQuarter + 1];
                        categoryLabels[indexOfQuarter] = categoryLabels[indexOfQuarter] + " " + quarterNumber;
                        categoryLabels.splice(indexOfQuarter + 1, 1);
                    }
                    let columnNumber = getColumnNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                    // Font Size
                    let fontSize = (rectWidth * self.yearViewLayout.yearTitleRatio);
                    let offset = columnNumber - 1;
                    let xCoord = (self.yearViewLayout.yearRectSize * (columnNumber - 1)) + padding;
                    let centerOfRect = xCoord + + (self.yearViewLayout.yearRectSize / 2) /*Half of Rect*/;
                    let rowNumber = getRowNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                    let yCoord = (self.yearViewLayout.yearRectSize * (rowNumber - 1)) + padding + (rectWidth / 2);
                    for (let i = 0; i < categoryLabels.length; i++) {
                        let label = formatMonthCategory(categoryLabels[i]);
                        d3.select(this).append("tspan")
                            .text(label)
                            .attr('font-family', self.viewModel.configurations.font)
                            .attr("x", (data: DateDataPoint) => {
                                if (label.length <= 2) {
                                    return centerOfRect - (fontSize * .5);
                                }
                                else {
                                    return centerOfRect - fontSize;
                                }
                            })
                            .attr("y", (data: DateDataPoint) => {
                                if (categoryLabels.length > 1) {
                                    return yCoord + (i * fontSize) - (categoryLabels.length * fontSize * .2);
                                }
                                else {
                                    return yCoord;
                                }
                            })
                            .attr("font-size", (data: DateDataPoint) => {
                                return fontSize;
                            });
                    }
                });

            dataPointRects.exit().remove();

            this.stateManager.addDrillDownSelections(this.calendarContainerGroup, this.viewModel.drillDownDataPoints);
            this.tooltipServiceWrapper.addTooltip(this.calendarContainerGroup.selectAll('.calendarPoint'),
                (tooltipEvent: TooltipEventArgs<DateDataPoint>) => getDrillDownTooltipData(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<DateDataPoint>) => tooltipEvent.data.selectionId);
        }

        /**
         * sets and returns the x coordinate of day in date
         * @method @private
         * @param {Date} date                           -current year/month/day                             
         * @param {number} monthOffSet                  -month offset
         * @param {ZoomLevel} zoomLevel                 -current zoom level
         * @param {DayConfiguration[]} dayIndexingArray -index of days in current month
         * @returns {number}                            -x coordinate
         */
        private setXCoordinateOfDay(date: Date, monthOffSet: number, zoomLevel: ZoomLevel, dayIndexingArray: DayConfiguation[]): number {
            let day = date.getDay();
            let configuredDay: DayConfiguation = _.find(dayIndexingArray, function (f: DayConfiguation) { return f.actualDayIndex == day });
            if (zoomLevel === ZoomLevel.ALL) {
                return (configuredDay.configuredDayIndex * this.layoutConfig.calendarDateRectSize) + monthOffSet;
            }
            else if (zoomLevel === ZoomLevel.MONTH) {
                return (configuredDay.configuredDayIndex * this.layoutConfig.calendarDateRectSize) + monthOffSet + this.layoutConfig.calendarDateRectSize - 5;
            }
        }

        /**
         * sets and returns y coordinate of selected date
         * @method @private
         * @param {Date} date                           -current year/month/day
         * @param {number} monthOffset                  -month offset
         * @param {ZoomLevel} zoomLevel                 -current zoom level
         * @param {number} weekStartDay                 -day number current week starts on
         * @param {DayConfiguration[]} dayIndexingArray -index of days in current month
         * @returns {number}                            -y coordinate
         */
        private setYCoordinateOfDay(date: Date, monthOffset: number, zoomLevel: ZoomLevel, weekStartDay: number, dayIndexingArray: DayConfiguation[]): number {
            let firstDayOfWeekInMonth = d3.time.month.floor(date).getDay();
            let firstDayOfMonth = d3.time.month.floor(date).getDay();
            let distanceToFirstDay = _.find(dayIndexingArray, function (f) { return f.actualDayIndex == firstDayOfMonth }).configuredDayIndex;;
            firstDayOfWeekInMonth = firstDayOfWeekInMonth - weekStartDay;
            const offset = distanceToFirstDay - 1;
            let weekOfMonth = Math.floor(((date.getDate() + offset) / 7));
            if (zoomLevel === ZoomLevel.ALL) {
                return (weekOfMonth * this.layoutConfig.calendarDateRectSize + TOP_PAD_DATES_ALL_ZOOM) + monthOffset;
            }
            else if (zoomLevel === ZoomLevel.MONTH) {
                return (weekOfMonth * this.layoutConfig.calendarDateRectSize + TOP_PAD_DATES_ALL_ZOOM) + monthOffset + 15;
            }
        }

        /**
         * Clears selected datapoint and removes selection visual
         * @method @private
         */
        private clearVisualSelections() {
            d3.selectAll('rect').classed('selected-rect', false).attr({
                'stroke': DATE_UNSELECTED_COLOR
            });
            this.stateManager.clearSelections();
        }
    }
}