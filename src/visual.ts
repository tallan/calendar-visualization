module powerbi.extensibility.visual {

    export class Visual implements IVisual {
        private readonly host: IVisualHost;
        public viewManager: ViewManager;

        /**
         * Creates and instance of the calendar. This is only called once.
         * @constructor
         * @param {VisualConstructorOptions} options    -Contains references to the element that will contain the visual
         *                                              and a reference to the host which contains services.
         */
        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            let selectionManager = options.host.createSelectionManager();
            let stateManager = new StateManager(selectionManager);
            let tooltipServiceWrapper = new TooltipServiceWrapper(this.host.tooltipService, options.element);
            // For scrollable
            options.element.style.overflow = 'auto';
            this.viewManager = new ViewManager(tooltipServiceWrapper, stateManager, options);
        }

        /**
         * Updates the state of the calendar. Every sequential databinding and resizing will call update
         * @method
         * @param {VisualUpdateOptions} options -Contains references to the size of the container and the dataView which contains
         *                                      all the data the visual had queried.
         */
        update(options: VisualUpdateOptions) {
            if(this.viewManager.stateManager.isBookmark){
                this.viewManager.stateManager.isBookmark = false;
                return;
            }
            // Build View Model
            let viewModel = this.visualTransform(options, this.host);

            // Render appropriate Zoom level
            this.viewManager.renderCalendar(options, viewModel);
        }

        /** 
         * Enumerates through the objects defined in the capabilities and adds the properties to the format pane.
         * Allows you to select which of the objects and properties you want to expose to the users in the property pane.
         * Objects and properties need to be defined in capabilities.json.
         * @method
         * @param {EnumerateVisualObjectInstancesOptions} options   -Map of defined objects.
         * @returns {VisualObjectInstance[]}                        enumerated objects from capabilities.json
         */
        enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            let objectName = options.objectName;
            let calendarConfiguration = this.viewManager.viewModel.configurations;
            const instances: VisualObjectInstance[] = [];
            switch (objectName) {
                case 'diverging':
                    instances.push({
                        objectName: objectName,
                        selector: null,
                        properties: {
                            diverging: calendarConfiguration.diverging.diverging,
                            minColor: calendarConfiguration.diverging.minColor,
                            centerColor: calendarConfiguration.diverging.centerColor,
                            maxColor: calendarConfiguration.diverging.maxColor,
                            minValue: calendarConfiguration.diverging.minValue,
                            centerValue: calendarConfiguration.diverging.centerValue,
                            maxValue: calendarConfiguration.diverging.maxValue
                        }
                    })
                    break;
                case 'dataPoint':
                    const dataPoint = {
                        objectName: objectName,
                        selector: null,
                        properties: {
                            defaultColor: calendarConfiguration.dataPoint
                        }
                    }
                    instances.push(dataPoint);
                    break;
                case 'calendar':
                    instances.push({
                        objectName: objectName,
                        selector: null,
                        properties: {
                            weekStartDay: calendarConfiguration.weekStartDay,
                            scrollDirection: calendarConfiguration.scrollDirection,
                            font: calendarConfiguration.font
                        }
                    })
                    if (calendarConfiguration.scrollDirection == 1 /*Horizontal - rows*/) {
                        instances.push({
                            objectName: objectName,
                            selector: null,
                            properties: { numberRows: calendarConfiguration.numberRows }
                        });
                    }
                    else {
                        instances.push({
                            objectName: objectName,
                            selector: null,
                            properties: { numberColumns: calendarConfiguration.numberColumns }
                        });
                    }
                    break;
            }
            return instances;
        }

        /**
         * Function that converts queried data into a view model that will be used by the visual.
         * 
         * @method
         * @param {VisualUpdateOptions} options -contains references to the container size and the dataView which contains 
         *                                      all queried data.
         * @param {IVisualHost} host            -contains references to the host which contains services.
         * @returns {CalendarViewModel}         -view model representing the calendar visual   
         */
        visualTransform(options: VisualUpdateOptions, host: IVisualHost): CalendarViewModel {
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
                },
                font: 'Segoe UI'
            };

            // Default View Model
            let viewModel: CalendarViewModel = {
                dataPoints: [],
                drillDownDataPoints: [],
                configurations: <CalendarConfigurations>{},
                dayIndexingArray: [] as DayConfiguation[],
                minimumDate: new Date("January 1, 1900 00:00:00"),
                maximumDate: new Date("January 1, 1900 00:00:00"),
                drillDownInfo: {
                    isDrillDown: false,
                    allowStandardCalendar: false,
                    dates: [],
                    labels: []
                },
                isLandingPage: false
            }
            if (!dataViews
                || !dataViews[0]
                || !dataViews[0].categorical
                || !dataViews[0].categorical.categories
                || !dataViews[0].categorical.categories[0].source
                || !dataViews[0].categorical.values
                || dataViews[0].categorical.categories[0].values.length == 0) {
                viewModel.isLandingPage = true;
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
                },
                font: getValue<string>(objects, 'calendar', 'font', defaultConfig.font)
            }
            viewModel.configurations = calendarConfig;
            let configurations = calendarConfig;
            viewModel.dayIndexingArray = getDayConfigurationArray(calendarConfig.weekStartDay);

            // Get Data Point Color
            let dataPointColor = configurations.dataPoint.solid.color as string;
            
            let dates: Date[] = dataViews[0].categorical.categories[0].values as Date[];
            const values: number[] = dataViews[0].categorical.values[0].values as number[];
            let drillDownInfo: DrillDownInformation = checkDrillDownRequirements(dataViews, dates);
            viewModel.drillDownInfo = drillDownInfo;
            dates = drillDownInfo.dates;

            if (viewModel.drillDownInfo.isDrillDown && !viewModel.drillDownInfo.allowStandardCalendar) {
                viewModel.drillDownDataPoints = getDrillDownDataPoints(viewModel, options, host);
            }
            else {
                // Standard Calendar
                viewModel.dataPoints = getDayDataPoints(dates, values, viewModel, options, host);
            }

            return viewModel;
        }
    }
}