module powerbi.extensibility.visual {

    function visualTransform(options: VisualUpdateOptions, host: IVisualHost): CalendarViewModel {
        let dataViews = options.dataViews;
        // Default Config
        let defaultConfig: CalendarConfigurations = {
            dataPoint: { solid: { color: '#01B8AA' } },
            weekStartDay: 0, // Sunday
            scrollDirection: 0,
            numberColumns: null,
            defaultNumberColumns: 3,
            numberRows: 0,
            diverging: {
                diverging: false,
                minColor: { solid: { color: null } },
                centerColor: { solid: { color: null } },
                maxColor: { solid: { color: null } },
                minValue: null,
                centerValue: null,
                maxValue: null
            }
        };

        // Default View Model
        let viewModel: CalendarViewModel = {
            dataPoints: [],
            drillDownDataPoints: [],
            configurations: <CalendarConfigurations>{},
            dayIndexingArray: [] as DayConfiguation[],
            minimumDate: new Date("January 1, 1900 00:00:00"),
            maximumDate: new Date("January 1, 1900 00:00:00"),
            isDrillDown: false
        }

        if (!dataViews
            || !dataViews[0]
            || !dataViews[0].categorical
            || !dataViews[0].categorical.categories
            || !dataViews[0].categorical.categories[0].source
            || !dataViews[0].categorical.values
            || dataViews[0].categorical.categories[0].values.length == 0) {
            return viewModel;
        }

        let objects = dataViews[0].metadata.objects;
        // Set Configurations
        let calendarConfig: CalendarConfigurations = {
            dataPoint: getValue<Fill>(objects, 'dataPoint', 'defaultColor', defaultConfig.dataPoint),
            weekStartDay: getValue<number>(objects, 'calendar', 'weekStartDay', defaultConfig.weekStartDay),
            scrollDirection: 0, //getValue<number>(objects, 'calendar', 'scrollDirection', defaultConfig.scrollDirection),
            numberColumns: getValue<number>(objects, 'calendar', 'numberColumns', defaultConfig.numberColumns),
            defaultNumberColumns: 3,
            numberRows: 0, //getValue<number>(objects, 'calendar', 'numberRows', defaultConfig.numberRows),
            diverging: {
                diverging: getValue<boolean>(objects, 'diverging', 'diverging', defaultConfig.diverging.diverging),
                minColor: getValue<Fill>(objects, 'diverging', 'minColor', defaultConfig.diverging.minColor),
                centerColor: getValue<Fill>(objects, 'diverging', 'centerColor', defaultConfig.diverging.centerColor),
                maxColor: getValue<Fill>(objects, 'diverging', 'maxColor', defaultConfig.diverging.maxColor),
                minValue: getValue<number>(objects, 'diverging', 'minValue', defaultConfig.diverging.minValue),
                centerValue: getValue<number>(objects, 'diverging', 'centerValue', defaultConfig.diverging.centerValue),
                maxValue: getValue<number>(objects, 'diverging', 'maxValue', defaultConfig.diverging.maxValue),
            }
        }
        viewModel.configurations = calendarConfig;
        let configurations = calendarConfig;
        viewModel.dayIndexingArray = getDayConfigurationArray(calendarConfig.weekStartDay);

        // Get Data Point Color
        let dataPointColor = configurations.dataPoint.solid.color as string;

        const dates: Date[] = dataViews[0].categorical.categories[0].values as Date[];
        const values: number[] = dataViews[0].categorical.values[0].values as number[];
        let drillDownView = dataViews[0].categorical.categories[0].source.displayName;
        let isDrillDown = typeof(dataViews[0].categorical.categories[0].values[0]) != 'object' ? true : false;
        viewModel.isDrillDown = isDrillDown;
        if (isDrillDown) {
            viewModel.drillDownDataPoints = getDrillDownDataPoints(viewModel, options, host)
        }
        else {
            // Standard Calendar
            viewModel.dataPoints = getDayDataPoints(dates, values, viewModel, options, host);
        }

        return viewModel;
    }

    function getDayDataPoints(dates: Date[], values: number[], viewModel: CalendarViewModel, options: VisualUpdateOptions, host: IVisualHost): CalendarDataPoint[] {
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
                year: dates[i].getFullYear()
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
                year: differenceDate.getFullYear()
            };
            calendarDataPoints.push(dataPoint);
        }
        return calendarDataPoints;
    }

    function getDrillDownDataPoints(viewModel: CalendarViewModel, options: VisualUpdateOptions, host: IVisualHost) {
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
            dataPoints.push({
                category: category,
                value: value,
                color: color(value),
                index: i + 1,
                selectionId: selectionId
            });
        }
        return dataPoints;
    }

    function getColorFromValues(min: number, max: number, configurations: CalendarConfigurations) {
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

    function getDayConfigurationArray(weekStartDay: number): DayConfiguation[] {
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

    function differenceOfArrays(test1, test2) {
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

    function getNumberOfColumnsByRow(numberOfRows: number, numberOfMonths: number) {
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

    function getNumberOfRowsByColumn(numberOfColumns: number, numberOfMonths: number) {
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

    function getMonthDiferrence(startDate: Date, endDate: Date) {
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

    function getLayoutConfiguration(viewPortWidth: number, viewPortHeight: number, configurations: CalendarConfigurations, minimumDate: Date, maximumDate: Date, zoomLevel: ZoomLevel) {
        let numberOfMonths = zoomLevel == ZoomLevel.ALL ? getMonthDiferrence(minimumDate, maximumDate) : 1;
        let numberOfColumns = configurations.numberColumns != null ? configurations.numberColumns : configurations.defaultNumberColumns;
        let layoutConfig: LayoutConfiguration = {
            horizontalMonthPadding: 20,
            verticalMonthPadding: 20,
            calendarDateRectSize: zoomLevel == ZoomLevel.ALL ? 15 : 50,
            monthTitleRatio: 0.6,
            numberOfColumns: configurations.scrollDirection == 0 ? numberOfColumns : getNumberOfColumnsByRow(configurations.numberRows, numberOfMonths),
            numberOfRows: configurations.scrollDirection == 1 ? configurations.numberRows : getNumberOfRowsByColumn(numberOfColumns, numberOfMonths),
            numberOfMonths: numberOfMonths,
            svgWidth: 0,
            svgHeight: 0
        };

        if (zoomLevel == ZoomLevel.ALL) {
            if (configurations.scrollDirection == 0) {
                let verticalScrollRectSize = viewPortWidth / ((8.33 * layoutConfig.numberOfColumns) + 1.33); // View Port Width / (Month Size + Padding) 
                layoutConfig.calendarDateRectSize = verticalScrollRectSize < 15 ? 15 : verticalScrollRectSize;
                layoutConfig.horizontalMonthPadding = layoutConfig.calendarDateRectSize * 1.33;
                layoutConfig.verticalMonthPadding = layoutConfig.calendarDateRectSize * 1.33;
                layoutConfig.svgWidth = ((layoutConfig.numberOfColumns + 1) * layoutConfig.horizontalMonthPadding) + (layoutConfig.numberOfColumns * layoutConfig.calendarDateRectSize * 7) - 20;
                layoutConfig.svgHeight = ((layoutConfig.numberOfRows + 1) * layoutConfig.verticalMonthPadding) + (layoutConfig.numberOfRows * layoutConfig.calendarDateRectSize * 7) + (layoutConfig.numberOfRows * layoutConfig.calendarDateRectSize) - layoutConfig.verticalMonthPadding;
            }
            else if (configurations.scrollDirection == 1) {
                let horizontalScrollRectSize = viewPortHeight / ((layoutConfig.numberOfRows * (7 + layoutConfig.monthTitleRatio + 1 + 1.33)) + 1.33);
                layoutConfig.calendarDateRectSize = horizontalScrollRectSize < 15 ? 15 : horizontalScrollRectSize;
                layoutConfig.horizontalMonthPadding = layoutConfig.calendarDateRectSize * 1.33;
                layoutConfig.verticalMonthPadding = layoutConfig.calendarDateRectSize * 1.33;
                layoutConfig.svgWidth = ((layoutConfig.numberOfColumns + 1) * layoutConfig.horizontalMonthPadding) + (layoutConfig.numberOfColumns * layoutConfig.calendarDateRectSize * 7) - 20;
                layoutConfig.svgHeight = ((layoutConfig.numberOfRows + 1) * layoutConfig.verticalMonthPadding) + (layoutConfig.numberOfRows * layoutConfig.calendarDateRectSize * 7) + (layoutConfig.numberOfRows * layoutConfig.calendarDateRectSize) - layoutConfig.verticalMonthPadding;
            }
        }
        else {
            layoutConfig.svgWidth = (layoutConfig.horizontalMonthPadding * 2) + (7 * layoutConfig.calendarDateRectSize) + 20;
            layoutConfig.svgHeight = (layoutConfig.verticalMonthPadding * 2) + (7 * layoutConfig.calendarDateRectSize) + (layoutConfig.monthTitleRatio * layoutConfig.calendarDateRectSize) - 50;
        }
        return layoutConfig;
    }

    function getYearViewLayoutConfiguration(viewPortWidth: number, viewPortHeight: number, configurations: CalendarConfigurations, numberOfYears: number) {
        let numberOfColumns = configurations.numberColumns != null ? configurations.numberColumns : configurations.defaultNumberColumns;
        let layoutConfig: YearViewLayoutConfiguration = {
            svgPadding: 30,
            yearRectSize: 100,
            numberOfColumns: configurations.scrollDirection == 0 ? numberOfColumns : getNumberOfColumnsByRow(configurations.numberRows, numberOfYears),
            numberOfRows: configurations.scrollDirection == 1 ? configurations.numberRows : getNumberOfRowsByColumn(numberOfColumns, numberOfYears),
            numberOfYears: numberOfYears,
            svgWidth: 500,
            svgHeight: 500,
            yearTitleRatio: 0.18
        };

        if (configurations.scrollDirection == 0) {
            let verticalScrollRectSize = (viewPortWidth - (2 * layoutConfig.svgPadding)) / (layoutConfig.numberOfColumns);
            layoutConfig.yearRectSize = verticalScrollRectSize < 100 ? 100 : verticalScrollRectSize;
            layoutConfig.svgWidth = (layoutConfig.yearRectSize * layoutConfig.numberOfColumns) + (2 * layoutConfig.svgPadding);
            layoutConfig.svgHeight = (layoutConfig.yearRectSize * layoutConfig.numberOfRows) + (2 * layoutConfig.svgPadding);
        }

        return layoutConfig;
    }

    export class Visual implements IVisual {
        private readonly host: IVisualHost;
        private readonly htmlElement: HTMLElement;
        private readonly stateManager: StateManager;
        private selectionManager: ISelectionManager;
        private selectionIdBuilder: ISelectionIdBuilder;
        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private calendarSVG: d3.Selection<SVGElement>;
        private calendarContainerGroup: d3.Selection<SVGElement>;
        private calendarConfiguration: CalendarConfigurations;
        private viewModel: CalendarViewModel;
        private resizingLayoutHelper: LayoutConfiguration;
        private yearViewLayoutHelper: YearViewLayoutConfiguration;

        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.htmlElement = options.element;

            // Construct Tallan Preview -- http://community.powerbi.com/t5/Developer/Changing-the-Default-Watermark-in-a-Custom-Visual/m-p/333695/highlight/true#M9874
            //this.constructTallanPreview(options);

            this.stateManager = new StateManager(this.host.createSelectionManager());
            this.selectionManager = this.host.createSelectionManager();
            this.selectionIdBuilder = options.host.createSelectionIdBuilder();
            this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);

            // For scrollable
            options.element.style.overflow = 'auto';

            let svg = this.calendarSVG = d3.select(options.element)
                .append('svg')
                .classed('calendarSVG', true);
            this.calendarContainerGroup = svg.append('g')
                .classed('calendarContainer', true);
        }

        update(options: VisualUpdateOptions) {
            d3.selectAll('.calendarContainer').remove();
            let svg = this.calendarSVG;
            this.calendarContainerGroup = svg.append('g')
                .classed('calendarContainer', true);

            // Build View Model
            const dataViews = options.dataViews;
            let viewModel: CalendarViewModel = this.viewModel = visualTransform(options, this.host);
            let configurations: CalendarConfigurations = this.calendarConfiguration = viewModel.configurations;
            if (viewModel.isDrillDown) {
                this.yearViewLayoutHelper = getYearViewLayoutConfiguration(options.viewport.width, options.viewport.height, configurations, viewModel.drillDownDataPoints.length);
                this.drillDownView(viewModel);
            }
            else {
                // Render appropriate Zoom level
                let currentZoomLevel = this.stateManager.getZoomLevel();
                let layoutConfiguration: LayoutConfiguration = this.resizingLayoutHelper = getLayoutConfiguration(options.viewport.width, options.viewport.height, configurations, viewModel.minimumDate, viewModel.maximumDate, currentZoomLevel);
                if (currentZoomLevel === ZoomLevel.ALL) {
                    this.renderAllZoom(options, viewModel);
                }
                else if (currentZoomLevel == ZoomLevel.MONTH) {
                    this.renderMonthZoom(options, viewModel, this.stateManager.getSelectedMonth(), this.stateManager.getSelectedYear());
                }

            }

            // Select all rects with selected-rect class
            d3.selectAll('.selected-rect').attr({ 'stroke': DATE_SELECTED_COLOR })
                .each(function () {
                    // Move selection to front
                    this.parentNode.appendChild(this);
                });
        }

        /** This function gets called for each of the objects defined in the capabilities 
         * files and allows you to select which of the objects and properties you 
         * want to expose to the users in the property pane.
         * Objects and properties need to be defined in capabilities.json
         * For example, when you choose a color for the cells in paintroller menu, 
         * this will be called. */
        enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            let objectName = options.objectName;
            const instances: VisualObjectInstance[] = [];
            switch (objectName) {
                case 'diverging':
                    instances.push({
                        objectName: objectName,
                        selector: null,
                        properties: {
                            diverging: this.calendarConfiguration.diverging.diverging,
                            minColor: this.calendarConfiguration.diverging.minColor,
                            centerColor: this.calendarConfiguration.diverging.centerColor,
                            maxColor: this.calendarConfiguration.diverging.maxColor,
                            minValue: this.calendarConfiguration.diverging.minValue,
                            centerValue: this.calendarConfiguration.diverging.centerValue,
                            maxValue: this.calendarConfiguration.diverging.maxValue
                        }
                    })
                    break;
                case 'dataPoint':
                    const dataPoint = {
                        objectName: objectName,
                        selector: null,
                        properties: {
                            defaultColor: this.calendarConfiguration.dataPoint
                        }
                    }
                    instances.push(dataPoint);
                    break;
                case 'calendar':
                    instances.push({
                        objectName: objectName,
                        selector: null,
                        properties: {
                            weekStartDay: this.calendarConfiguration.weekStartDay,
                            scrollDirection: this.calendarConfiguration.scrollDirection
                        }
                    })
                    if (this.calendarConfiguration.scrollDirection == 1 /*Horizontal - rows*/) {
                        instances.push({
                            objectName: objectName,
                            selector: null,
                            properties: { numberRows: this.calendarConfiguration.numberRows }
                        });
                    }
                    else {
                        instances.push({
                            objectName: objectName,
                            selector: null,
                            properties: { numberColumns: this.calendarConfiguration.numberColumns }
                        });
                    }
                    break;
            }
            return instances;
        }

        /**********************************************************************
         *                             ALL ZOOM                               *
         **********************************************************************/
        private renderAllZoom(options: VisualUpdateOptions, viewModel: CalendarViewModel) {
            if (viewModel.dataPoints.length == 0) {
                return;
            }

            // Clear SVG
            d3.selectAll('.calendarContainer').remove();
            let svg = this.calendarSVG;
            this.calendarContainerGroup = svg.append('g')
                .classed('calendarContainer', true);

            const minDate: Date = viewModel.minimumDate;
            const maxDate: Date = viewModel.maximumDate;
            let configNumberOfColumns = viewModel.configurations.numberColumns;
            let configNumberOfRows = viewModel.configurations.numberRows;
            let scrollDirection = viewModel.configurations.scrollDirection;
            let numberOfMonths: number = this.resizingLayoutHelper.numberOfMonths;
            this.resizingLayoutHelper = getLayoutConfiguration(options.viewport.width, options.viewport.height, viewModel.configurations, viewModel.minimumDate, viewModel.maximumDate, ZoomLevel.ALL);

            let actualNumberOfColumns = this.resizingLayoutHelper.numberOfColumns;
            let actualNumberOfRows = this.resizingLayoutHelper.numberOfRows;

            // Render Calendar Month
            let startMonth, iterateMonth = viewModel.minimumDate.getMonth();
            let startYear, iterateYear = viewModel.minimumDate.getFullYear();
            let endMonth = viewModel.maximumDate.getMonth();
            let endYear = viewModel.maximumDate.getFullYear();
            let endLoopMonth = endMonth + 1 != 12 ? endMonth + 1 : 0;
            let endLoopYear = endLoopMonth != 0 ? endYear : endYear + 1;

            let monthIndex = 0;
            let continueMonths: boolean = true;

            // Get Size of SVG
            this.calendarSVG.attr({
                width: this.resizingLayoutHelper.svgWidth,
                height: this.resizingLayoutHelper.svgHeight
            });

            while (continueMonths) {
                monthIndex = monthIndex + 1;
                // Get data points for the month -- TODO - Make Compatible with IE
                let monthDataPoints = viewModel.dataPoints.filter(function (obj) {
                    return obj.month === iterateMonth && obj.year == iterateYear;
                });
                let columnNumber = this.getColumnNumber(monthIndex, numberOfMonths, actualNumberOfColumns, actualNumberOfRows, scrollDirection);
                let rowNumber = this.getRowNumber(monthIndex, numberOfMonths, actualNumberOfColumns, actualNumberOfRows, scrollDirection);
                this.renderMonth(options, monthDataPoints, iterateMonth, iterateYear, monthIndex, columnNumber, rowNumber, viewModel);
                iterateMonth = iterateMonth + 1 != 12 ? iterateMonth + 1 : 0;
                iterateYear = iterateMonth != 0 ? iterateYear : iterateYear + 1;
                if (iterateMonth == endLoopMonth && iterateYear == endLoopYear) {
                    continueMonths = false;
                }
            }

            this.addSelections(viewModel.dataPoints, viewModel);

            this.tooltipServiceWrapper.addTooltip(this.calendarContainerGroup.selectAll('.day'),
                (tooltipEvent: TooltipEventArgs<CalendarDataPoint>) => Visual.getTooltipData(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<CalendarDataPoint>) => null);
        }

        // TODO - KC - refactor this in a helper
        private getColumnNumber(monthIndex: number, numberOfMonths: number, numberOfColumns: number, numberOfRows: number, scrollDirection: number) {
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

        // TODO - KC - refactor this in a helper
        private getRowNumber(monthIndex: number, numberOfMonths: number, numberOfColumns: number, numberOfRows: number, scrollDirection: number) {
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

        private formatMonthCategory(category: string) {
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

        private renderMonth(options: VisualUpdateOptions, dataPoints: CalendarDataPoint[], monthNumber: number, yearNumber: number, monthIndex: number, columnNumber: number, rowNumber: number, viewModel: CalendarViewModel) {
            let self = this;
            let monthLabel = Month[monthNumber] + ' ' + yearNumber;
            let stateManager = this.stateManager;
            let selectionManager = this.selectionManager;
            let selections = selectionManager.getSelectionIds();
            let clearVisualSelections = this.clearVisualSelections;
            let monthHorizontalOffset = columnNumber == 1 ? this.resizingLayoutHelper.horizontalMonthPadding : (this.resizingLayoutHelper.calendarDateRectSize * 7 * (columnNumber - 1)) + (this.resizingLayoutHelper.horizontalMonthPadding * columnNumber); // Considers size of calendar, and padding between months;
            let monthVerticalOffset = rowNumber == 1 ? this.resizingLayoutHelper.verticalMonthPadding : (this.resizingLayoutHelper.calendarDateRectSize * 7 * (rowNumber - 1)) + (20 * rowNumber) + this.resizingLayoutHelper.verticalMonthPadding;

            // Render Month Label
            this.calendarContainerGroup.append('text')
                .style('text-anchor', 'start')
                .attr('font-size', this.resizingLayoutHelper.calendarDateRectSize)
                .attr('x', monthHorizontalOffset).attr('y', monthVerticalOffset)
                .attr('fill', Color[Color.GREY])
                .text(monthLabel)
                .on('mouseover', function () { self.addMonthHoverStyling.call(this, (viewModel.configurations.dataPoint.solid.color as string)); })
                .on('mouseout', this.removeMonthHoverStyling)
                .on('click', function () {
                    // GO TO MONTH ZOOM
                    self.clearVisualSelections();
                    self.stateManager.setMonthZoom(ZoomLevel.MONTH, monthNumber, yearNumber);
                    self.stateManager.selectMonth(viewModel, monthNumber, yearNumber);
                    self.renderMonthZoom(options, viewModel, monthNumber, yearNumber);
                });

            // Render Day labels            
            for (let dayLabel of viewModel.dayIndexingArray) {
                let dayLabelConfig: DayConfiguation = dayLabel;
                this.calendarContainerGroup.append('text')
                    .style('text-anchor', 'start')
                    .attr('font-size', this.resizingLayoutHelper.calendarDateRectSize * this.resizingLayoutHelper.monthTitleRatio)
                    .attr('x', (dayLabelConfig.configuredDayIndex * this.resizingLayoutHelper.calendarDateRectSize) + monthHorizontalOffset).attr('y', monthVerticalOffset + 15)
                    .attr('fill', Color[Color.GREY])
                    .text(dayLabel.dayLabel);
            }

            let dayRects = this.calendarContainerGroup.selectAll('.day' + monthIndex).data(dataPoints);
            dayRects.enter().append('rect')
                .attr("width", this.resizingLayoutHelper.calendarDateRectSize)
                .attr("height", this.resizingLayoutHelper.calendarDateRectSize)
                .attr("x", (data: CalendarDataPoint) => {
                    return this.setXCoordinateOfDay(data.date, columnNumber, monthHorizontalOffset, ZoomLevel.ALL, viewModel.dayIndexingArray);
                })
                .attr("y", (data: CalendarDataPoint) => {
                    return this.setYCoordinateOfDay(data.date, rowNumber, monthVerticalOffset, ZoomLevel.ALL, viewModel.configurations.weekStartDay, viewModel.dayIndexingArray);
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

        private setXCoordinateOfDay(date: Date, columnNumber: number, monthOffSet: number, zoomLevel: ZoomLevel, dayIndexingArray: DayConfiguation[]): number {
            let day = date.getDay();
            let configuredDay: DayConfiguation = _.find(dayIndexingArray, function (f) { return f.actualDayIndex == day });
            if (zoomLevel === ZoomLevel.ALL) {
                return (configuredDay.configuredDayIndex * this.resizingLayoutHelper.calendarDateRectSize) + monthOffSet;
            }
            else if (zoomLevel === ZoomLevel.MONTH) {
                return (configuredDay.configuredDayIndex * this.resizingLayoutHelper.calendarDateRectSize) + monthOffSet + this.resizingLayoutHelper.calendarDateRectSize - 5;
            }
        }

        private setYCoordinateOfDay(date: Date, rowNumber: number, monthOffset: number, zoomLevel: ZoomLevel, weekStartDay: number, dayIndexingArray: DayConfiguation[]): number {
            let firstDayOfWeekInMonth = d3.time.month.floor(date).getDay();
            let firstDayOfMonth = d3.time.month.floor(date).getDay();
            let distanceToFirstDay = _.find(dayIndexingArray, function (f) { return f.actualDayIndex == firstDayOfMonth }).configuredDayIndex;;
            firstDayOfWeekInMonth = firstDayOfWeekInMonth - weekStartDay;
            const offset = distanceToFirstDay - 1;
            let weekOfMonth = Math.floor(((date.getDate() + offset) / 7));
            if (zoomLevel === ZoomLevel.ALL) {
                return (weekOfMonth * this.resizingLayoutHelper.calendarDateRectSize + TOP_PAD_DATES_ALL_ZOOM) + monthOffset;
            }
            else if (zoomLevel === ZoomLevel.MONTH) {
                return (weekOfMonth * this.resizingLayoutHelper.calendarDateRectSize + TOP_PAD_DATES_ALL_ZOOM) + monthOffset + 15;
            }
        }

        /**********************************************************************
         *                             MONTH ZOOM                             *
         **********************************************************************/
        private renderMonthZoom(options: VisualUpdateOptions, viewModel: CalendarViewModel, monthNumber: number, yearNumber) {
            // Clear SVG
            d3.selectAll('.calendarContainer').remove();
            let svg = this.calendarSVG;
            this.calendarContainerGroup = svg.append('g')
                .classed('calendarContainer', true);

            this.resizingLayoutHelper = getLayoutConfiguration(options.viewport.width, options.viewport.height, viewModel.configurations, viewModel.minimumDate, viewModel.maximumDate, ZoomLevel.MONTH);
            // Get Size of SVG
            this.calendarSVG.attr({
                width: this.resizingLayoutHelper.svgWidth,
                height: this.resizingLayoutHelper.svgHeight
            });
            const selectedMonth: string = Month[monthNumber];
            const selectedYear: number = yearNumber;
            let self = this;

            // Create Marker definition and path for back button
            let monthFontSize = this.resizingLayoutHelper.calendarDateRectSize / 2;
            let xAxisStart = 70;
            let xAxistEnd = 70;
            let yAxisStart = 60
            let yAxisEnd = yAxisStart - monthFontSize;
            var data = [{ id: 0, name: 'arrow', path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z', linePath: 'M ' + xAxisStart.toString() + ',' + yAxisStart.toString() + ' L ' + xAxistEnd.toString() + ',' + yAxisEnd.toString(), viewbox: '-5 -5 10 10' }];
            this.calendarContainerGroup.append('rect').classed('allZoomButton', true)
                .attr('x', 60).attr('y', yAxisEnd - 8).attr("width", 20).attr("height", yAxisStart - yAxisEnd + 8)
                .attr('fill', "white")
                .on('click', () => {
                    // Zoom out to all
                    self.clearVisualSelections();
                    self.stateManager.setAllZoom();
                    self.renderAllZoom(options, viewModel); // TODO - KC
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
                    self.clearVisualSelections();
                    self.stateManager.setAllZoom();
                    self.renderAllZoom(options, viewModel);
                });

            // Month and Year Label
            this.calendarContainerGroup.append('text')
                .style('text-anchor', 'start')
                .attr('font-size', this.resizingLayoutHelper.calendarDateRectSize * this.resizingLayoutHelper.monthTitleRatio)
                .attr('x', LEFT_PAD_MONTH_ZOOM + 70).attr('y', TOP_PAD_MONTH_ZOOM - 40)
                .attr('fill', Color[Color.GREY])
                .text(`${selectedMonth} ${selectedYear}`);
            // Render Day labels            
            for (let dayLabel of viewModel.dayIndexingArray) {
                let dayLabelConfig: DayConfiguation = dayLabel;
                this.calendarContainerGroup.append('text')
                    .style('text-anchor', 'start')
                    .attr('font-size', this.resizingLayoutHelper.calendarDateRectSize * this.resizingLayoutHelper.monthTitleRatio)
                    .attr('x', (dayLabelConfig.configuredDayIndex * this.resizingLayoutHelper.calendarDateRectSize) + 50).attr('y', 100)
                    .attr('fill', Color[Color.GREY])
                    .text(dayLabel.dayLabel);
            }

            let monthDataPoints: CalendarDataPoint[] = _.filter(viewModel.dataPoints, function (dataPoint) { return dataPoint.month == monthNumber && dataPoint.year == yearNumber; });
            let dayRects = this.calendarContainerGroup.selectAll('.day').data(monthDataPoints);
            dayRects.enter().append('rect').classed('day', true)
                .attr("width", this.resizingLayoutHelper.calendarDateRectSize)
                .attr("height", this.resizingLayoutHelper.calendarDateRectSize)
                .attr("x", (data: CalendarDataPoint) => {
                    return this.setXCoordinateOfDay(data.date, 1, 50, ZoomLevel.ALL, viewModel.dayIndexingArray);
                })
                .attr("y", (data: CalendarDataPoint) => {
                    return this.setYCoordinateOfDay(data.date, 1, 100, ZoomLevel.ALL, viewModel.configurations.weekStartDay, viewModel.dayIndexingArray);
                })
                .attr('fill', (data: CalendarDataPoint) => {
                    return data.color;
                })
                .attr('stroke', (data: CalendarDataPoint) => {
                    return DATE_UNSELECTED_COLOR; // TODO
                })
                .attr('stroke-width', `2px`);

            dayRects.exit().remove();

            // Show dates for start of week
            // date box
            const datesOfMonth: Date[] = [];
            for (let dp of monthDataPoints) {
                datesOfMonth.push(dp.date);
            }

            this.calendarContainerGroup.selectAll('.dayNumberBox')
                .data(datesOfMonth.filter((date: Date) => {
                    return date.getDay() === viewModel.configurations.weekStartDay;
                }))
                .enter().append('rect').classed("dayNumberBox", true)
                .attr('width', 18)
                .attr('height', 18)
                .attr('x', (date: Date) => {
                    const rectX = this.setXCoordinateOfDay(date, 1, 50, ZoomLevel.MONTH, viewModel.dayIndexingArray);
                    return rectX - 13;
                })
                .attr('y', (date: Date) => {
                    const rectY = this.setYCoordinateOfDay(date, 1, 100, ZoomLevel.MONTH, viewModel.configurations.weekStartDay, viewModel.dayIndexingArray);;
                    return rectY - 15;
                })
                .attr('fill', (date: Date) => {
                    return Color[Color.WHITE];
                })
                .attr('stroke', (date: Date) => {
                    return DATE_UNSELECTED_COLOR;
                })
                .attr('stroke-width', `2px`)
            // Date Number
            let dayNumberText = this.calendarContainerGroup.selectAll('.dayNumber')
                .data(datesOfMonth.filter((date: Date) => {
                    return date.getDay() === viewModel.configurations.weekStartDay;
                }));
            dayNumberText.enter().append('text').classed('dayNumber', true)
                .style('text-anchor', 'end')
                .attr('font-size', 12)
                .attr('fill', Color[Color.GREY])
                .attr('x', (date: Date) => {
                    const rectX = this.setXCoordinateOfDay(date, 1, 50, ZoomLevel.MONTH, viewModel.dayIndexingArray);
                    return rectX + 3;
                })
                .attr('y', (date: Date) => {
                    const rectY = this.setYCoordinateOfDay(date, 1, 100, ZoomLevel.MONTH, viewModel.configurations.weekStartDay, viewModel.dayIndexingArray);;
                    return rectY;
                })
                .text((date: Date) => {
                    return date.getDate();
                });

            this.addSelections(monthDataPoints, viewModel);
            this.tooltipServiceWrapper.addTooltip(this.calendarContainerGroup.selectAll('.calendarPoint'),
                (tooltipEvent: TooltipEventArgs<CalendarDataPoint>) => Visual.getTooltipData(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<CalendarDataPoint>) => null);
        }

        private drillDownView(viewModel: CalendarViewModel) {
            // Clear SVG
            d3.selectAll('.calendarContainer').remove();
            let svg = this.calendarSVG;
            this.calendarContainerGroup = svg.append('g')
                .classed('calendarContainer', true);
            let yearViewLayoutHelper = this.yearViewLayoutHelper;

            // Get Size of SVG
            this.calendarSVG.attr({
                width: yearViewLayoutHelper.svgWidth,
                height: yearViewLayoutHelper.svgHeight
            });
            this.renderDrillDownView(viewModel, yearViewLayoutHelper);
        }

        private renderDrillDownView(viewModel: CalendarViewModel, yearViewLayout: YearViewLayoutConfiguration) {
            let self = this;
            let dataPoints = viewModel.drillDownDataPoints;
            let numberOfBoxes = dataPoints.length;
            let numberOfRows = yearViewLayout.numberOfRows;
            let numberOfColumns = yearViewLayout.numberOfColumns;
            let rectWidth = yearViewLayout.yearRectSize;
            let padding = yearViewLayout.svgPadding;
            let dataPointRects = this.calendarContainerGroup.selectAll('.calendarPoint').data(dataPoints);
            dataPointRects.enter().append('rect').classed('calendarPoint', true)
                .attr("width", rectWidth)
                .attr("height", rectWidth)
                .attr("x", (data: DateDataPoint) => {
                    let columnNumber = this.getColumnNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                    let offset = columnNumber - 1;
                    return (yearViewLayout.yearRectSize * (columnNumber - 1)) + padding;
                })
                .attr("y", (data: DateDataPoint) => {
                    let rowNumber = this.getRowNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                    return (yearViewLayout.yearRectSize * (rowNumber - 1)) + padding;
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
                    let categoryLabels = data.category.split(" ");
                    var indexOfQuarter = categoryLabels.indexOf("Qtr");
                    if(indexOfQuarter != -1){
                        let quarterNumber = categoryLabels[indexOfQuarter + 1];
                        categoryLabels[indexOfQuarter] = categoryLabels[indexOfQuarter] + " " + quarterNumber;
                        categoryLabels.splice(indexOfQuarter + 1, 1);
                    }
                    let columnNumber = self.getColumnNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                    let offset = columnNumber - 1;
                    let xCoord = (yearViewLayout.yearRectSize * (columnNumber - 1)) + padding + (rectWidth / 2) - (.2 * rectWidth);
                    let rowNumber = self.getRowNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                    let yCoord = (yearViewLayout.yearRectSize * (rowNumber - 1)) + padding + (rectWidth / 2);
                    // Font Size
                    let fontSize = (rectWidth * yearViewLayout.yearTitleRatio)/ categoryLabels.length;
                    for (let i = 0; i < categoryLabels.length; i++) {
                        d3.select(this).append("tspan")
                        .text(self.formatMonthCategory(categoryLabels[i]))
                        .attr("x", (data: DateDataPoint) => {
                            return xCoord;
                        })
                        .attr("y", (data: DateDataPoint) => {
                            return yCoord + (i * fontSize);
                        })
                        .attr("font-size", (data: DateDataPoint) => {
                            return fontSize;
                        })
                    }
                });

            dataPointRects.exit().remove();

            this.addDrillDownSelections(viewModel.drillDownDataPoints);
            this.tooltipServiceWrapper.addTooltip(this.calendarContainerGroup.selectAll('.calendarPoint'),
                (tooltipEvent: TooltipEventArgs<DateDataPoint>) => Visual.getDrillDownTooltipData(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<DateDataPoint>) => null);
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
            textElem.setAttribute("fill", Color[Color.GREY]);
        }

        private static getTooltipData(value: CalendarDataPoint): VisualTooltipDataItem[] {
            return [{
                displayName: d3.time.format('%Y-%m-%d')(value.date),
                value: value.value.toString()
            }];
        }

        private static getDrillDownTooltipData(value: DateDataPoint): VisualTooltipDataItem[] {
            return [{
                displayName: value.category,
                value: value.value.toString()
            }];
        }

        private addSelections(dataPoints: CalendarDataPoint[], viewModel: CalendarViewModel) {
            // Add Selections
            let self = this;
            let selectionManager = this.selectionManager;
            let stateManager = this.stateManager;
            let selectedIds: ISelectionId[] = [];
            let singleSelect = false;
            let dayRects = this.calendarContainerGroup.selectAll('.day');
            dayRects.on('click', function (d) {
                let minShift = d.date;
                let maxShift = d.date;
                let currentClickDate = d.date;
                let lastClickedDate = stateManager.getLastClickedDate();
                if (d.selectionId != null) {
                    let mouseEvent = d3.event as MouseEvent;
                    // For 'Ctrl' press - Add new existing selections, but remove if prexisted
                    if (mouseEvent.ctrlKey && !mouseEvent.shiftKey) {
                        singleSelect = false;
                        let isSelected = d3.select(this).attr("stroke") == DATE_UNSELECTED_COLOR.toString() ? false : true;
                        if (isSelected) {
                            selectedIds = _.filter(selectedIds, function (sid) { return sid != d.selectionId; });
                        }
                        else {
                            selectedIds.push(d.selectionId);
                        }
                        stateManager.setAnchor(d.date);
                    }
                    else if (!mouseEvent.ctrlKey && mouseEvent.shiftKey) {
                        // For 'Shift, get range of dates
                        // Remove Selected Date Rect Class and set to unselected
                        d3.selectAll('.day').classed('selected-rect', false).attr({
                            'stroke': DATE_UNSELECTED_COLOR
                        });
                        let anchor = stateManager.getAnchor();
                        if (anchor == null) {
                            stateManager.setAnchor(d.date);
                            anchor = currentClickDate;
                        }
                        minShift = currentClickDate < anchor ? currentClickDate : anchor;
                        maxShift = currentClickDate > anchor ? currentClickDate : anchor;
                        selectedIds = [];
                        // Get all selection Ids between the min and max dates
                        let selectedDataPoints: CalendarDataPoint[] = _.filter(dataPoints, function (dataPoint) { return dataPoint.date >= minShift && dataPoint.date <= maxShift; });
                        _.each(selectedDataPoints, function (dp) {
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
                        stateManager.setAnchor(d.date);
                    }

                    // Allow selection only if visual is rendered in a view that supports interactivty (e.g. Reports)
                    selectionManager.select(selectedIds).then((ids: ISelectionId[]) => {
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
                            if (singleSelect) {
                                // If single click remove all selected style
                                d3.selectAll('.day').classed('selected-rect', false);
                            }
                            let isSelected = d3.select(this).attr("stroke") == DATE_UNSELECTED_COLOR.toString() ? false : true;
                            if (!isSelected) {
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

                        // TODO - Bug when you single select a selected square after special select

                    });
                }

                // Month Zoom Specific
                if (ZoomLevel.MONTH == stateManager.getZoomLevel()) {
                    // Insure Day Numbers are rendered first
                    self.calendarContainerGroup.selectAll('.dayNumberBox').each(function () {
                        // Move selection to front
                        this.parentNode.appendChild(this);
                    })
                    self.calendarContainerGroup.selectAll('.dayNumber').each(function () {
                        // Move selection to front
                        this.parentNode.appendChild(this);
                    })

                    let selectedRectsInMonth = d3.selectAll('.selected-rect');
                    if (selectedRectsInMonth[0].length == 0) {
                        stateManager.selectMonth(viewModel, stateManager.getSelectedMonth(), stateManager.getSelectedYear());
                    }
                }
            });
        }

        private addDrillDownSelections(dataPoints: DateDataPoint[]) {
            // Add Selections
            let self = this;
            let selectionManager = this.selectionManager;
            let yearRects = this.calendarContainerGroup.selectAll('.calendarPoint');
            yearRects.on('click', function (d) {
                // Check to see if previously selected
                let isSelected = d3.select(this).attr("stroke") == DATE_UNSELECTED_COLOR.toString() ? false : true;
                // Selection Power BI data points
                selectionManager
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
                        self.calendarContainerGroup.selectAll('.calendarPointLabel').each(function () {
                            // Move selection to front
                            this.parentNode.appendChild(this);
                        })
                    });
            });
        }

        private clearVisualSelections() {
            d3.selectAll('rect').classed('selected-rect', false).attr({
                'stroke': DATE_UNSELECTED_COLOR
            });
            this.selectionManager.clear();
        }

        // private constructTallanPreview(options: VisualConstructorOptions) {
        //     var tallanPreview = d3.select(options.element).append('svg').classed('tallan-preview', true).attr("xlink:href", "http://www.tallan.com");
        //     tallanPreview.append('text').text('Tallan')
        //         .attr('x', 100).attr('y', 100)
        //         .attr('fill', Color[Color.GREY])
        //         .attr("xlink:href", "http://www.tallan.com");
        // }
    }
}