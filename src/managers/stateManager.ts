module powerbi.extensibility.visual {

    /** 
     * manages date selections and zoom views 
     * @class
    */
    export class StateManager {
        public selectionManager: ISelectionManager;
        private zoomLevel: ZoomLevel;
        public isBookmark: boolean;
        private selectedMonth: Month;
        private selectedYear: number;

        /** anchor selected date for SHIFT clicking */
        public anchorSelection: Date;
        public lastClickedDate: Date;

        /**
         * creates a new statemanager with selection manager and default values for anchor and zoom level
         * @constructor
         * @param {ISelectionManager} selectionManager -selection manager
         */
        constructor(selectionManager: ISelectionManager) {
            this.selectionManager = selectionManager;
            this.setAnchor(null);
            this.setAllZoom();
        }

        /**
         * Registers a callback method to be called whenever a bookmark is loaded.
         * @method
         * @param {CalendarViewModel} viewModel Model representing current calendar view.
         */
        registerOnSelectCallback(viewModel: CalendarViewModel) {
            this.selectionManager.registerOnSelectCallback((ids: visuals.ISelectionId[]) => {

                let dataPoints: DataPoint[] = viewModel.drillDownInfo.isDrillDown ? viewModel.drillDownDataPoints : viewModel.dataPoints;
                let idkeyex = JSON.stringify(ids[0]["dataMap"]) + '[]';
                let datakeyex = dataPoints[31].selectionId.getKey();
                console.log(idkeyex);
                console.log(datakeyex);
                console.log(idkeyex == datakeyex);
                debugger;
                let d = d3.selectAll('.day')
                    .filter((data: DataPoint) => ids.some(id => data.selectionId.getKey() == JSON.stringify(id["dataMap"]) + '[]'))
                    .classed('selected-rect', true)
                    .attr('stroke', DATE_SELECTED_COLOR)
                    .each(function () {
                        this.parentNode.appendChild(this);
                    });


                // selects all tiles.... how do we filter to only selected???
                // d3.selectAll('.day')
                // .attr({
                //     'stroke': DATE_SELECTED_COLOR
                // }).each(function () {
                //     // Move selection to front
                //     this.parentNode.appendChild(this);
                // });
                this.isBookmark = true;
                console.log(this.isBookmark);
            });
        }

        /**
         * Adds the SelectionIds for the current month/year to the selection manager
         * @method
         * @param {CalendarViewModel} viewModel -the calendar view model
         * @param {Month} selectedMonth         -selected month
         * @param {Year} selectedYear           -selected year
         */
        selectMonth(viewModel: CalendarViewModel, selectedMonth?: Month, selectedYear?: number) {
            let monthDataPoints: CalendarDataPoint[] = _.filter(viewModel.dataPoints, function (dataPoint) { return dataPoint.month == selectedMonth && dataPoint.year == selectedYear; });
            let selectedIds: ISelectionId[] = [];
            _.each(monthDataPoints, function (dp) {
                if (dp.selectionId != null) {
                    selectedIds.push(dp.selectionId);
                }
            });

            this.selectionManager.select(selectedIds);
        }

        /**
         * Adds the SelectionIds for the selected year to the selection manager
         * @method
         * @param {CalendarDataPoint[]} dataPoints  -data points for the calendar visual
         * @param {number} selectedYear             -selected year
         */
        selectYear(dataPoints: CalendarDataPoint[], selectedYear: number) {
            let yearPoints: CalendarDataPoint[] = _.filter(dataPoints, function (dataPoint) { return dataPoint.year == selectedYear; });
            let selectedIds: ISelectionId[] = [];
            _.each(yearPoints, function (dp) {
                if (dp.selectionId != null) {
                    selectedIds.push(dp.selectionId);
                }
            });

            this.selectionManager.select(selectedIds);
        }

        /**
         * Add selection capabilities to datapoints
         * @method @private
         * @param {d3.Selection<SVGElement} calendarContainerGroup selection element for current calendar view
         * @param {CalendarDataPoint[]} dataPoints  -datapoints to add selections to
         */
        public addSelections(calendarContainerGroup: d3.Selection<SVGElement>, viewModel: CalendarViewModel) {
            // Add Selections
            let self = this;
            let selectedIds: ISelectionId[] = [];
            let singleSelect = false;
            let dayRects = calendarContainerGroup.selectAll('.day');

            dayRects.on('click', function (d: CalendarDataPoint) {
                let wasMultiSelect = d3.selectAll('.selected-rect').size() > 1;
                let minShift = d.date;
                let maxShift = d.date;
                let currentClickDate = d.date;
                if (d.selectionId != null) {
                    let mouseEvent = d3.event as MouseEvent;
                    // For 'Ctrl' press - Add new existing selections, but remove if prexisted
                    if (mouseEvent.ctrlKey && !mouseEvent.shiftKey) {
                        singleSelect = false;
                        let isSelected = d3.select(this).attr("stroke") == DATE_UNSELECTED_COLOR.toString() ? false : true;
                        if (isSelected) {
                            selectedIds = _.filter(selectedIds, function (sid: ISelectionId) { return sid != d.selectionId; });
                        }
                        else {
                            selectedIds.push(d.selectionId);
                        }
                        self.setAnchor(d.date);
                    }
                    else if (!mouseEvent.ctrlKey && mouseEvent.shiftKey) {
                        // For 'Shift, get range of dates
                        // Remove Selected Date Rect Class and set to unselected
                        d3.selectAll('.day').classed('selected-rect', false).attr({
                            'stroke': DATE_UNSELECTED_COLOR
                        });
                        let anchor = self.getAnchor();
                        if (anchor == null) {
                            self.setAnchor(d.date);
                            anchor = currentClickDate;
                        }
                        minShift = currentClickDate < anchor ? currentClickDate : anchor;
                        maxShift = currentClickDate > anchor ? currentClickDate : anchor;
                        selectedIds = [];
                        // Get all selection Ids between the min and max dates
                        let selectedDataPoints: CalendarDataPoint[] = _.filter(viewModel.dataPoints, function (dataPoint) {
                            return dataPoint.date >= minShift && dataPoint.date <= maxShift;
                        });
                        _.each(selectedDataPoints, function (dp: CalendarDataPoint) {
                            if (dp.selectionId != null) {
                                selectedIds.push(dp.selectionId);
                            }
                        });
                    }
                    // Single Select
                    else {
                        singleSelect = true;
                        if (selectedIds.length) {
                            selectedIds = [];
                        }
                        selectedIds.push(d.selectionId);
                        self.setAnchor(d.date);
                    }

                    // Allow selection only if visual is rendered in a view that supports interactivty (e.g. Reports)
                    self.selectionManager.select(selectedIds).then((ids: ISelectionId[]) => {
                        if (!mouseEvent.ctrlKey && mouseEvent.shiftKey) {
                            d3.selectAll('.day').filter(function (d) {
                                let cdp: CalendarDataPoint = d;
                                return cdp.date >= minShift && cdp.date <= maxShift ? true : false;
                            }).classed('selected-rect', true).attr({
                                'stroke': DATE_SELECTED_COLOR
                            }).each(function () {
                                // Move selection to front
                                this.parentNode.appendChild(this);
                            });
                        }
                        else {
                            let isSelected = d3.select(this).attr("stroke") == DATE_UNSELECTED_COLOR.toString() ? false : true;
                            if (singleSelect) {
                                // If single click remove all selected style
                                d3.selectAll('.day').classed('selected-rect', false);
                            }
                            if (!isSelected || (singleSelect && wasMultiSelect)) {
                                d3.select(this).classed('selected-rect', true);
                            }
                            else {
                                d3.select(this).classed('selected-rect', false);
                            }
                            // Unselect all days
                            d3.selectAll('.day').attr({ 'stroke': DATE_UNSELECTED_COLOR })
                            // Select all rects with selected-rect class
                            d3.selectAll('.selected-rect').attr({ 'stroke': DATE_SELECTED_COLOR })
                                .each(function () {
                                    // Move selection to front
                                    this.parentNode.appendChild(this);
                                });
                        }
                    });

                }
                // Month Zoom Specific
                if (ZoomLevel.MONTH == self.getZoomLevel()) {
                    // Insure Day Numbers are rendered first
                    calendarContainerGroup.selectAll('.dayNumberBox').each(function () {
                        // Move selection to front
                        this.parentNode.appendChild(this);
                    })
                    calendarContainerGroup.selectAll('.dayNumber').each(function () {
                        // Move selection to front
                        this.parentNode.appendChild(this);
                    })

                    let selectedRectsInMonth = d3.selectAll('.selected-rect');
                    if (selectedRectsInMonth[0].length == 0) {
                        self.selectMonth(viewModel, self.getSelectedMonth(), self.getSelectedYear());
                    }
                }
            });
        }

        /**
        * Adds selection capabilities to each data point on a drill dwon view.
        * @method @private
        * @param {d3.Selection<SVGElement>} calendarContainerGroup selection element for the calendar container group
        * @param {DateDataPoint} dataPoints    -data points to add selection capabilities to
        */
        public addDrillDownSelections(calendarContainerGroup: d3.Selection<SVGElement>, dataPoints: DateDataPoint[]) {
            // Add Selections
            let self = this;
            let yearRects = calendarContainerGroup.selectAll('.calendarPoint');
            yearRects.on('click', function (d) {
                // Check to see if previously selected
                let isSelected = d3.select(this).attr("stroke") == DATE_UNSELECTED_COLOR.toString() ? false : true;
                // Selection Power BI data points
                self.selectionManager
                    .select(d.selectionId)
                    .then((ids: ISelectionId[]) => {
                        d3.selectAll('.calendarPoint').classed('selected-rect', false).attr({
                            'stroke': DATE_UNSELECTED_COLOR
                        });
                        if (!isSelected) {
                            d3.select(this).classed('selected-rect', true).attr({
                                'stroke': DATE_SELECTED_COLOR
                            }).each(function () {
                                // Move selection to front
                                this.parentNode.appendChild(this);
                            });
                        }
                        else {
                            d3.select(this).classed('selected-rect', false);
                        }
                        calendarContainerGroup.selectAll('.calendarPointLabel').each(function () {
                            // Move selection to front
                            this.parentNode.appendChild(this);
                        })
                    });
            });
        }

        /**
         * Gets current zoom level from this state manager
         * @method
         * @returns {ZoomLevel} -enumerator representing current zoom level
         */
        getZoomLevel(): ZoomLevel {
            return this.zoomLevel;
        }

        /**
         * sets the current zoom level in this state manager
         * @param {ZoomLevel} zoomLevel -enumerator representing new zoom level}
         */
        setZoomLevel(zoomLevel: ZoomLevel) {
            this.zoomLevel = zoomLevel;
        }

        /**
         * sets the zoom level and selected month and year in this state manager
         * @method
         * @param {ZoomLevel} zoomLevel -enumerator representing zoom level
         * @param {number} monthNumber  -selected month
         * @param {number} yearNumber   -selected year
         */
        setMonthZoom(zoomLevel: ZoomLevel, monthNumber: number, yearNumber: number) {
            this.zoomLevel = ZoomLevel.MONTH;
            this.selectedMonth = monthNumber;
            this.selectedYear = yearNumber;
        }

        /**
         * gets selected month from this state manager
         * @method
         * @returns {Month} -selected month
         */
        getSelectedMonth(): Month {
            return this.selectedMonth;
        }

        /**
         * gets selected year from this state manager
         * @method
         * @returns {number}    -selected year
         */
        getSelectedYear(): number {
            return this.selectedYear;
        }

        /**
         * sets the zoom level to ALL in this state manager
         * @method
         */
        setAllZoom() {
            this.zoomLevel = ZoomLevel.ALL;
            this.selectedMonth = null;
            this.selectedYear = null;
            this.setAnchor(null);
        }

        /**
         * sets the anchor in this state manager as the given date
         * @method
         * @param {Date} anchor    -given date
         */
        setAnchor(anchor: Date) {
            this.anchorSelection = anchor;
        }

        /**
         * gets the selected anchor from this state manager
         * @method
         * @returns {Date}  -a date which is the selected anchor
         */
        getAnchor(): Date {
            return this.anchorSelection;
        }

        /**
         * sets the given date as the date last clicked in this state manager
         * @method
         * @param {Date} date   -date to set as last clicked
         */
        setLastClickedDate(date: Date) {
            this.lastClickedDate = date;
        }

        /**
         * gets the date last clicked from this state manager
         * @method
         * @returns {Date} -the date last clicked
         */
        getLastClickedDate(): Date {
            return this.lastClickedDate;
        }

        getSelectionIds(): ISelectionId[] {
            return this.selectionManager.getSelectionIds();
        }

        clearSelections() {
            this.selectionManager.clear();
        }
    }
}