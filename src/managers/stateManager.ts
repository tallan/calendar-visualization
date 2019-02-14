module powerbi.extensibility.visual{
    
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
        setMonthZoom(zoomLevel: ZoomLevel, monthNumber: number, yearNumber: number){
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
        setAnchor(anchor: Date){
            this.anchorSelection = anchor;
        }

        /**
         * gets the selected anchor from this state manager
         * @method
         * @returns {Date}  -a date which is the selected anchor
         */
        getAnchor(): Date{
            return this.anchorSelection;
        }

        /**
         * sets the given date as the date last clicked in this state manager
         * @method
         * @param {Date} date   -date to set as last clicked
         */
        setLastClickedDate(date: Date){
            this.lastClickedDate = date;
        }

        /**
         * gets the date last clicked from this state manager
         * @method
         * @returns {Date} -the date last clicked
         */
        getLastClickedDate(){
            return this.lastClickedDate;
        }
    }
}