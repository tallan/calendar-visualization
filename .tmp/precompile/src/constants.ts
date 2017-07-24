module powerbi.extensibility.visual.CalendarVisualA45056645E4E428B9D26EF971839A6B2  {

    //
    // ENUMS
    //
    export enum Color { 
        RED = 0, GREEN, BLUE, YELLOW, WHITE, PURPLE, ORANGE, GREY 
    }
    /** Monday to Sunday format */
    export const enum Day {
        MON = 0, TUE, WED, THU, FRI, SAT, SUN
    }
    export enum Month {
        JAN = 0, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC
    }
    export const enum ZoomLevel {
        ALL = 0, MONTH
    }
    export const enum WeekFormat {
        SUN_SAT = 0, MON_SUN
    }
    export const enum KeyMod {
        SHIFT = 0, CTRL, NONE
    }

    //
    // CONSTANTS AND SETTINGS
    //
    export const WEEK_FORMAT: WeekFormat = WeekFormat.SUN_SAT;  // change week format here
    export const MAX_NUM_WEEKS_A_MONTH = 6;
    export const NUM_DAYS_PER_WEEK = 7;
    export const NUM_MONTHS_PER_ROW = 3;

    // ALL VIEW 
    export const MONTH_HORIZONTAL_PAD_ALL_ZOOM = 40;
    export const MONTH_VERTICAL_PAD_ALL_ZOOM = 20;
    export const TOP_PAD_ALL_ZOOM = 20;
    export const TOP_PAD_DATES_ALL_ZOOM = 20;
    export const STROKE_WIDTH_ALL_ZOOM = 1;
    
    // MONTH VIEW
    export const LEFT_PAD_MONTH_ZOOM = 20;
    export const RIGHT_PAD_MONTH_ZOOM = 20;
    export const TOP_PAD_MONTH_ZOOM = 100;
    export const STROKE_WIDTH_MONTH_ZOOM = 4;

    export const DATE_SELECTED_COLOR = '#000000';
    export const DATE_UNSELECTED_COLOR = '#999';
    export const DEFAULT_CELL_COLOR_TOP = '#01B8AA';
    export const DEFAULT_CELL_COLOR_BOT = '#dddddd';
    export const DEFAULT_TOUCH_DELAY = 1000;
    export const UNSELECTED_STROKE_ATTR = 'oldStyle';
}