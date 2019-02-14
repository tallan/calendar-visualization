module powerbi.extensibility.visual.CalendarVisualA45056645E4E428B9D26EF971839A6B5  {

    /**
     * checks the calendar visual's date data role for a heirarchy date, and return drilldown information if true
     * @function @exports
     * @param {DataView[]} dataViews    -the dataviews associated with the calendar visual
     * @param {Date[]} dateArray        -dates featured int he current view
     * @returns {DrillDownInformaton}   -information specific to drilldown views
     */
    export function checkDrillDownRequirements(dataViews: DataView[], dateArray: Date[]): DrillDownInformation {
        let drillDownLabelArray: string[] = [];
        let isDrillDown = typeof (dataViews[0].categorical.categories[0].values[0]) != 'object' ? true : false;
        if (isDrillDown) {
            let categories = dataViews[0].categorical.categories[0];
            let categoryArray = categories.values as string[];

            // All arrays should be the same
            let length = dataViews[0].categorical.values[0].values.length;
            for (let i = 0; i < length; i++) {
                let buildCategory: string[] = [];
                buildCategory.push(categoryArray[i]);
                drillDownLabelArray.push(buildCategory.join(" "));
            }
        }
        const drillDownInfo: DrillDownInformation = {
            isDrillDown: isDrillDown,
            allowStandardCalendar: false,
            dates: dateArray,
            labels: drillDownLabelArray
        };
        return drillDownInfo;
    }

    /**
     * gets data points for provided dates
     * @param {Date[]} dates                -dates to convert to data points 
     * @param {number[]} values             -values for dates
     * @param {CalendarViewmodel} viewModel -view model for calendar visual
     * @param {VisualUpdateOptions} options -Contains references to the size of the container and the dataView which contains
     *                                      all the data the visual had queried.
     * @param {IVisualHost} host            -contains services for the calendar visual
     * @returns {CalendarDataPoint[]}       -calendar data points
     */
    export function getDayDataPoints(dates: Date[], values: number[], viewModel: CalendarViewModel, options: VisualUpdateOptions, host: IVisualHost): CalendarDataPoint[] {
        let calendarDataPoints: CalendarDataPoint[] = [];
        // Get Minimum and Maximum Values and dates
        let minValue = d3.min(values, function (d) { return d; });
        let maxValue = d3.max(values, function (d) { return d; });
        let minDateDataPoint = d3.min(dates, function (d) { return d; });
        viewModel.minimumDate = new Date(minDateDataPoint.getFullYear(), minDateDataPoint.getMonth(), 1);
        let maxDateDataPoint = d3.max(dates, function (d) { return d; });
        viewModel.maximumDate = new Date(maxDateDataPoint.getFullYear(), maxDateDataPoint.getMonth() + 1, 0);
        let maxRangeDate = new Date(maxDateDataPoint.getFullYear(), maxDateDataPoint.getMonth() + 1, 1);
        let timeSpan: Date[] = d3.time.day.range(viewModel.minimumDate, maxRangeDate);
        let difference: Date[] = differenceOfArrays(dates, timeSpan);

        // setup colors for each date depending on configurations
        let color = getColorFromValues(minValue, maxValue, viewModel.configurations);

        // Set Data Points from Power BI
        for (let i = 0; i < dates.length; i++) {
            const selectionId: visuals.ISelectionId = host.createSelectionIdBuilder()
                .withCategory(options.dataViews[0].categorical.categories[0], i)
                .createSelectionId();
            const dataPoint: CalendarDataPoint = {
                color: color(values[i]),
                date: dates[i],
                value: values[i],
                selectionId: selectionId,
                month: dates[i].getMonth(),
                year: dates[i].getFullYear(),
                selected: false
            };
            calendarDataPoints.push(dataPoint);
        }

        // Add Zero Value Date Points
        for (let i = 0; i < difference.length; i++) {
            let differenceDate = new Date(difference[i].toString());
            const dataPoint: CalendarDataPoint = {
                color: color(0),
                date: differenceDate,
                value: 0,
                selectionId: null,
                month: differenceDate.getMonth(),
                year: differenceDate.getFullYear(),
                selected: false
            };
            calendarDataPoints.push(dataPoint);
        }
        return calendarDataPoints;
    }

    /**
     * gets drill down data points from the data view for the current view
     * @function @exports
     * @param {CalendarViewModel} viewModel -view model representing the calendar visual
     * @param {VisualUpdateOptions} options -Contains references to the size of the container and the dataView which contains
     *                                      all the data the visual had queried
     * @param {IVisualHost} host            -contains services for calendar visual
     * @returns {DateDataPoint[]}            -data points for all dates in current view
     */
    export function getDrillDownDataPoints(viewModel: CalendarViewModel, options: VisualUpdateOptions, host: IVisualHost): DateDataPoint[] {
        let categories: string[] = options.dataViews[0].categorical.categories[0].values as string[];
        let values: number[] = options.dataViews[0].categorical.values[0].values as number[];
        let drillDownType = options.dataViews[0].categorical.categories[0].source.displayName;
        // Get Minimum and Maximum Values and dates
        let minValue = d3.min(values, function (d) { return d; });
        let maxValue = d3.max(values, function (d) { return d; });
        let color = getColorFromValues(minValue, maxValue, viewModel.configurations);

        // Create Data Points
        let dataPoints: DateDataPoint[] = [];
        for (let i = 0; i < categories.length; i++) {
            let selectionId: visuals.ISelectionId = host.createSelectionIdBuilder()
                .withCategory(options.dataViews[0].categorical.categories[0], i)
                .createSelectionId();
            let category = categories[i].toString();
            let value = values[i];
            let label = viewModel.drillDownInfo.labels[i];
            dataPoints.push({
                category: category,
                value: value,
                color: color(value),
                index: i + 1,
                selectionId: selectionId,
                label: label,
                selected: false
            });
        }
        return dataPoints;
    }

    /**
     * gets day configuration array based on week start day
     * @function @exports
     * @param weekStartDay  -day number week starts on
     */
    export function getDayConfigurationArray(weekStartDay: number): DayConfiguation[] {
        const dayArray: (number | string)[][] = [[0, 'Su'], [1, 'Mo'], [2, 'Tu'], [3, 'We'], [4, 'Th'], [5, 'Fr'], [6, 'Sa']];
        let rightArray = dayArray;
        let leftArray = dayArray.splice(weekStartDay);
        let configuredArray = leftArray.concat(rightArray);
        let configuredDayIndexArray: (DayConfiguation)[] = [];
        for (let i = 0; i <= 6; i++) {
            let dayConfig: DayConfiguation = { actualDayIndex: Number(configuredArray[i][0]), configuredDayIndex: i, dayLabel: String(configuredArray[i][1]) };
            configuredDayIndexArray.push(dayConfig);
        }
        return configuredDayIndexArray
    }

    /**
     * returns the difference of two arrays
     * @function @exports
     * @param {any[]} test1     -array
     * @param {any[]} test2     -array
     * @returns {any[]}         -difference of the two arrays
     */
    export function differenceOfArrays(test1: any[], test2: any[]): any[] {
        var helpArray = [];
        var difference = [];
        for (var i = 0; i < test1.length; i++) {
            helpArray[test1[i]] = true;
        }
        for (var j = 0; j < test2.length; j++) {
            if (helpArray[test2[j]]) {
                delete helpArray[test2[j]];
            }
            else {
                helpArray[test2[j]] = true;
            }
        }
        for (var k in helpArray) {
            difference.push(k);
        }
        return difference;
    }

    /**
     * gets number of columns in calendar from the number of rows and number of months in calendar
     * @function @exports
     * @param {number} numberOfRows     -number of rows in calendar
     * @param {number} numberOfMonths   -number of months in cleandar
     * @returns {number}                -number of columns in calendar
     */
    export function getNumberOfColumnsByRow(numberOfRows: number, numberOfMonths: number): number {
        let numberOfColumns: number = 0;
        let monthsOverRows = numberOfMonths / numberOfRows;
        // See if it was an even divide
        if (monthsOverRows - Math.floor(monthsOverRows) == 0) {
            numberOfColumns = monthsOverRows;
        }
        else {
            numberOfColumns = Math.ceil(monthsOverRows);
        }
        return numberOfColumns;
    }

    /**
     * gets number of rows in calendar from number of columns and number of months in calendar
     * @function @exports
     * @param {number} numberOfColumns  -number of columns in calendar
     * @param {number} numberOfMonths   -number of months in calendar
     * @returns {number}                number of rows in calendar
     */
    export function getNumberOfRowsByColumn(numberOfColumns: number, numberOfMonths: number): number {
        let numberOfRows: number = 0;
        let monthsOverColumns = numberOfMonths / numberOfColumns;
        // See if it was an even divide
        if (monthsOverColumns - Math.floor(monthsOverColumns) == 0) {
            numberOfRows = monthsOverColumns;
        }
        else {
            numberOfRows = Math.ceil(monthsOverColumns);
        }
        return numberOfRows;
    }

    /**
     * gets color from values and calendar configuration
     * @function @exports
     * @param {number} min                              -min color value
     * @param {number} max                              -max color value
     * @param {CalendarConfiguration} configurations    -current configurations for calendar visual
     * @returns {d3.scale.Linear<string, string>}       color value
     */
    export function getColorFromValues(min: number, max: number, configurations: CalendarConfigurations): d3.scale.Linear<string, string> {
        let color = d3.scale.linear<string>();
        // setup colors for each date depending on configurations
        if (configurations.diverging.diverging) {
            // Get Diverging Values
            let centerDivergingValue = configurations.diverging.centerValue;
            let minDivergingValue = configurations.diverging.minValue;
            let maxDivergingValue = configurations.diverging.maxValue;
            let divergingColor = d3.scale.linear<string>();
            color.domain([minDivergingValue, centerDivergingValue, maxDivergingValue])
                .range([configurations.diverging.minColor.solid.color, configurations.diverging.centerColor.solid.color, configurations.diverging.maxColor.solid.color]);
        }
        else {
            color.domain([min, max]).range([Color[Color.WHITE], configurations.dataPoint.solid.color]);
        }
        return color;
    }

    /**
     * gets number of columns
     * @funciton @exports
     * @param {number} monthIndex       -index of month
     * @param {number} numberOfMonths   -number of months
     * @param {number} numberOfColumns  -number of columns
     * @param {number} numberOfRows     -number of rows
     * @param {number} scrollDirection  -scroll direction
     * @returns {number}                number of columns
     */
    export function getColumnNumber(monthIndex: number, numberOfMonths: number, numberOfColumns: number, numberOfRows: number, scrollDirection: number): number {
        // Month Index is base '1'
        if (scrollDirection == 0 /*Vertical - input columns*/) {
            let modulusCheck = monthIndex % numberOfColumns;
            if (modulusCheck == 0) {
                return numberOfColumns;
            }
            else {
                return modulusCheck;
            }
        }
        else { /*Horizontal - input rows*/
            let fullRows = numberOfMonths % numberOfRows != 0 ? numberOfMonths % numberOfRows : numberOfRows;
            if (monthIndex > (fullRows * numberOfColumns)) {
                numberOfColumns = numberOfColumns - 1;
                monthIndex = monthIndex - 1;
            }
            let modulusCheck = monthIndex % numberOfColumns;
            if (modulusCheck == 0) {
                return numberOfColumns;
            }
            else {
                return modulusCheck;
            }
        }
    }

    /**
     * gets number of rows
     * @function @exports
     * @param {number} monthIndex       -index of month
     * @param {number} numberOfMonths   -number of months in view
     * @param {number} numberOfColumns  -number of columns in view
     * @param {number} numberOfRows     -number of rows in view
     * @param {number} scrollDirection  -scroll direction
     * @returns {number}                number of rows
     */
    export function getRowNumber(monthIndex: number, numberOfMonths: number, numberOfColumns: number, numberOfRows: number, scrollDirection: number): number {
        if (scrollDirection == 0) {
            return Math.ceil(monthIndex / numberOfColumns);
        }
        else {
            let fullRows = numberOfMonths % numberOfRows != 0 ? numberOfMonths % numberOfRows : numberOfRows;
            if (monthIndex > (fullRows * numberOfColumns)) {
                numberOfColumns = numberOfColumns - 1;
                monthIndex = monthIndex - 1;
            }
            return Math.ceil(monthIndex / numberOfColumns);
        }
    }

    /**
     * returns an abbreviated label for a full month name
     * @function @exports
     * @param {string} category -name of month
     * @returns {string}        abbreviated month name
     */
    export function formatMonthCategory(category: string): string {
        switch (category) {
            case "January": {
                category = "JAN";
                break;
            }
            case "February": {
                category = "FEB";
                break;
            }
            case "March": {
                category = "MAR";
                break;
            }
            case "April": {
                category = "APR";
                break;
            }
            case "May": {
                category = "MAY";
                break;
            }
            case "June": {
                category = "JUN";
                break;
            }
            case "July": {
                category = "JUL";
                break;
            }
            case "August": {
                category = "AUG";
                break;
            }
            case "September": {
                category = "SEP";
                break;
            }
            case "October": {
                category = "OCT";
                break;
            }
            case "November": {
                category = "NOV";
                break;
            }
            case "December": {
                category = "DEC";
                break;
            }
            default: {
                break;
            }
        }
        return category;
    }

    /**
     * event callback for link/view navigation styling. adds styling on hover
     * @function @exports
     * @param {string} color        -desired color of link on hover
     * @param {Element} textElem    -element to add styling to
     */
    export function addMonthHoverStyling(color: string, textElem?: Element) {
        textElem = textElem && textElem instanceof Element ? textElem : (this as any);
        textElem.setAttribute('stroke', color);
        textElem.setAttribute('fill', color);
    }

    /**
     * Event callback for link/view navigation styling. removes styling on leaving element
     * @function @exports
     * @param {Element} textElem    -element to remove styling from
     */
    export function removeMonthHoverStyling(textElem?: Element) {
        textElem = textElem && textElem instanceof Element ? textElem : (this as any);
        textElem.removeAttribute('stroke');
        textElem.setAttribute("fill", Color[Color.GREY]);
    }

    /**
     * gets tooltip data for a given data point
     * @function @exports
     * @param {CalendarDataPoint} value     -data point
     * @returns {VisualTooltipDataItem[]}   tool tiptip data
     */
    export function getTooltipData(value: CalendarDataPoint): VisualTooltipDataItem[] {
        return [{
            displayName: d3.time.format('%Y-%m-%d')(value.date),
            value: value.value.toString()
        }];
    }

    /**
     * gets tooltip for drilldown data point
     * @function @exports
     * @param {DateDatePoint} value         -data point
     * @returns {VisualTooltipDataItem[]}   tooltip data
     */
    export function getDrillDownTooltipData(value: DateDataPoint): VisualTooltipDataItem[] {
        return [{
            displayName: value.label,
            value: value.value.toString()
        }];
    }
}

