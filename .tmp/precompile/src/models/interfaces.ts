module powerbi.extensibility.visual.CalendarVisualA45056645E4E428B9D26EF971839A6B5  {

    /**
     * The view model. Holds all data retrieved at every update cycle 
     * @interface
     */
    export interface CalendarViewModel {
        dataPoints: CalendarDataPoint[];
        configurations: CalendarConfigurations;
        dayIndexingArray: DayConfiguation[];
        drillDownDataPoints: DateDataPoint[];
        minimumDate: Date;
        maximumDate: Date;
        drillDownInfo: DrillDownInformation;
    };

    /**
     * A base data point
     * @interface
     */
    export interface DataPoint {
        selected: boolean;
        color: string;
        value: number;
        selectionId: visuals.ISelectionId;
    }

    /**
     * A data point for a specific date
     * @interface
     * @extends     DataPoint
     */
    export interface DateDataPoint extends DataPoint {
        category: string;
        index: number;
        label: string;
    }

    /**
     * A data point with information for the date it represents
     * @interface
     * @extends     DataPoint
     */
    export interface CalendarDataPoint extends DataPoint {
        date: Date;
        month: number;
        year: number;
    }

    /**
     * information specific to a drill down view
     * @interface
     */
    export interface DrillDownInformation {
        isDrillDown: boolean;
        allowStandardCalendar: boolean;
        dates: Date[];
        labels: string[];
    }
    
    /**
     * configurations for the calendar visual
     * @interface
     */
    export interface CalendarConfigurations {
        dataPoint: Fill,
        weekStartDay: number,
        scrollDirection: number,
        numberColumns: number,
        defaultNumberColumns: number,
        numberRows: number,
        diverging: DivergingColorsConfig
    }

    /** 
     * configuration for diverging colors
     * @interface
    */
    export interface DivergingColorsConfig {
        diverging: boolean,
        minColor: Fill,
        centerColor: Fill,
        maxColor: Fill,
        minValue: number,
        centerValue: number,
        maxValue: number
    }

    /**
     * configuration for day displaying
     * @interface
     */
    export interface DayConfiguation {
        actualDayIndex: number,
        configuredDayIndex: number,
        dayLabel: string
    }
}