module powerbi.extensibility.visual {

    // ENUMS
    export enum Color { 
        RED = 0, GREEN, BLUE, YELLOW, WHITE, PURPLE, ORANGE, GREY 
    }
    export enum Month {
        JAN = 0, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC
    }
    export const enum ZoomLevel {
        ALL = 0, MONTH = 1
    }

    export const enum KeyMod {
        SHIFT = 0, CTRL, NONE
    }

    // CONSTANTS AND SETTINGS
    export const MAX_NUM_WEEKS_A_MONTH = 6;
    export const NUM_DAYS_PER_WEEK = 7;
    export const NUM_MONTHS_PER_ROW = 3;

    // ALL VIEW 
    export const TOP_PAD_DATES_ALL_ZOOM = 20;
    export const STROKE_WIDTH_ALL_ZOOM = 1;
    
    // MONTH VIEW
    export const LEFT_PAD_MONTH_ZOOM = 20;
    export const RIGHT_PAD_MONTH_ZOOM = 20;
    export const TOP_PAD_MONTH_ZOOM = 100;
    export const STROKE_WIDTH_MONTH_ZOOM = 4;

    export const DATE_SELECTED_COLOR = '#000000';
    export const DATE_UNSELECTED_COLOR = '#999';
}