module powerbi.extensibility.visual.CalendarVisualA45056645E4E428B9D26EF971839A6B5  {

    /**
     * @class
     * configuration for a yearview layout
     */
    export class YearViewLayoutConfiguration {
        svgPadding: number;
        yearRectSize: number;
        numberOfColumns: number;
        numberOfRows: number;
        numberOfYears: number;
        svgWidth: number;
        svgHeight: number;
        yearTitleRatio: number;

        /**
         * creates a new instance of 
         * @param {number} viewPortWidth                    -width of viewport
         * @param {number} viewPortHeight                   -height of viewport
         * @param {CalendarConfigurations} configurations   -calendar configurations
         * @param {number} numberOfYears                    -number of years in calendar
         */
        public constructor(viewPortWidth: number, viewPortHeight: number, configurations: CalendarConfigurations, numberOfYears: number) {
            let numberOfColumns = configurations.numberColumns != null ? configurations.numberColumns : configurations.defaultNumberColumns;
            this.svgPadding = 30;
            this.yearRectSize = 100;
            this.numberOfColumns = configurations.scrollDirection == 0 ? numberOfColumns : getNumberOfColumnsByRow(configurations.numberRows, numberOfYears);
            this.numberOfRows = configurations.scrollDirection == 1 ? configurations.numberRows : getNumberOfRowsByColumn(numberOfColumns, numberOfYears);
            this.numberOfYears = numberOfYears;
            this.svgWidth = 500;
            this.svgHeight = 500;
            this.yearTitleRatio = 0.18;

            if (configurations.scrollDirection == 0) {
                let verticalScrollRectSize = (viewPortWidth - (2 * this.svgPadding)) / (this.numberOfColumns);
                this.yearRectSize = verticalScrollRectSize < 100 ? 100 : verticalScrollRectSize;
                this.svgWidth = (this.yearRectSize * this.numberOfColumns) + (2 * this.svgPadding);
                this.svgHeight = (this.yearRectSize * this.numberOfRows) + (2 * this.svgPadding);
            }
        }
    }
}