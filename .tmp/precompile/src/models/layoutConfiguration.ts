module powerbi.extensibility.visual.CalendarVisualA45056645E4E428B9D26EF971839A6B5  {

    /**
     * @class
     * Configuration for calendar layout
     */
    export class LayoutConfiguration {
        horizontalMonthPadding: number;
        verticalMonthPadding: number;
        calendarDateRectSize: number;
        monthTitleRatio: number;
        numberOfColumns: number;
        numberOfRows: number;
        numberOfMonths: number;
        svgWidth: number;
        svgHeight: number;

        /**
         * creates a new instance of LayoutConfiguration.
         * Sets viewport width and height, calendar configurations, min and max dates, and zoom level
         * @constructor
         * @param viewPortWidth 
         * @param viewPortHeight 
         * @param configurations 
         * @param minimumDate 
         * @param maximumDate 
         * @param zoomLevel 
         */
        public constructor(options: VisualUpdateOptions, viewModel: CalendarViewModel, zoomLevel: ZoomLevel) {
            let numberOfMonths = zoomLevel == ZoomLevel.ALL ? this.getMonthDiferrence(viewModel.minimumDate, viewModel.maximumDate) : 1;
            let numberOfColumns = viewModel.configurations.numberColumns != null ? viewModel.configurations.numberColumns : viewModel.configurations.defaultNumberColumns;
            this.horizontalMonthPadding = 20;
            this.verticalMonthPadding = 20;
            this.calendarDateRectSize = zoomLevel == ZoomLevel.ALL ? 15 : 50;
            this.monthTitleRatio = 0.6;
            this.numberOfColumns = viewModel.configurations.scrollDirection == 0 ? numberOfColumns : getNumberOfColumnsByRow(viewModel.configurations.numberRows, numberOfMonths);
            this.numberOfRows = viewModel.configurations.scrollDirection == 1 ? viewModel.configurations.numberRows : getNumberOfRowsByColumn(numberOfColumns, numberOfMonths);
            this.numberOfMonths = numberOfMonths;
            this.svgWidth = 0;
            this.svgHeight = 0;

            if (zoomLevel == ZoomLevel.ALL) {
                if (viewModel.configurations.scrollDirection == 0) {
                    let verticalScrollRectSize = options.viewport.width / ((8.33 * this.numberOfColumns) + 1.33); // View Port Width / (Month Size + Padding) 
                    this.calendarDateRectSize = verticalScrollRectSize < 15 ? 15 : verticalScrollRectSize;
                    this.horizontalMonthPadding = this.calendarDateRectSize * 1.33;
                    this.verticalMonthPadding = this.calendarDateRectSize * 1.33;
                    this.svgWidth = ((this.numberOfColumns + 1) * this.horizontalMonthPadding) + (this.numberOfColumns * this.calendarDateRectSize * 7) - 20;
                    this.svgHeight = ((this.numberOfRows + 1) * this.verticalMonthPadding) + (this.numberOfRows * this.calendarDateRectSize * 7) + (this.numberOfRows * this.calendarDateRectSize) - this.verticalMonthPadding;
                }
                else if (viewModel.configurations.scrollDirection == 1) {
                    let horizontalScrollRectSize = options.viewport.height / ((this.numberOfRows * (7 + this.monthTitleRatio + 1 + 1.33)) + 1.33);
                    this.calendarDateRectSize = horizontalScrollRectSize < 15 ? 15 : horizontalScrollRectSize;
                    this.horizontalMonthPadding = this.calendarDateRectSize * 1.33;
                    this.verticalMonthPadding = this.calendarDateRectSize * 1.33;
                    this.svgWidth = ((this.numberOfColumns + 1) * this.horizontalMonthPadding) + (this.numberOfColumns * this.calendarDateRectSize * 7) - 20;
                    this.svgHeight = ((this.numberOfRows + 1) * this.verticalMonthPadding) + (this.numberOfRows * this.calendarDateRectSize * 7) + (this.numberOfRows * this.calendarDateRectSize) - this.verticalMonthPadding;
                }
            }
            else {
                this.calendarDateRectSize = ((options.viewport.width) - (this.horizontalMonthPadding * 2)) / 8;
                this.svgWidth = (this.horizontalMonthPadding * 2) + (7 * this.calendarDateRectSize) + 20;
                this.svgHeight = (this.verticalMonthPadding * 2) + (8 * this.calendarDateRectSize) /*Days*/ + (this.monthTitleRatio * this.calendarDateRectSize) - 20;
            }
        }

        /**
         * gets the month difference between two dates
         * @function @exports
         * @param {Date} startDate  -start date
         * @param {Date} endDate    -end date
         * @returns {number}        difference between months
         */
        private getMonthDiferrence(startDate: Date, endDate: Date): number {
            var year1 = startDate.getFullYear();
            var year2 = endDate.getFullYear();
            var month1 = startDate.getMonth();
            var month2 = endDate.getMonth();
            if (month1 === 0) { //Have to take into account
                month1++;
                month2++;
            }
            return (year2 - year1) * 12 + (month2 - month1) + 1;
        }
    }
}