module powerbi.extensibility.visual {

    /** The view model. Holds all data retrieved at every update cycle */
    export interface CalendarViewModel {
        dataPoints: CalendarDataPoint[];
        configurations: CalendarConfigurations;
        dayIndexingArray: DayConfiguation[];
        yearDataPoints: YearDataPoint[];
        minimumDate: Date;
        maximumDate: Date;
    };
    
    export interface CalendarConfigurations {
        dataPoint: Fill,
        weekStartDay: number,
        scrollDirection: number,
        numberColumns: number,
        defaultNumberColumns: number,
        numberRows: number,
        yearView: boolean,
        diverging: DivergingColorsConfig
    }

    export interface DivergingColorsConfig {
        diverging: boolean,
        minColor: Fill,
        centerColor: Fill,
        maxColor: Fill,
        minValue: number,
        centerValue: number,
        maxValue: number
    }

    export interface DayConfiguation {
        actualDayIndex: number,
        configuredDayIndex: number,
        dayLabel: string
    }

    export interface LayoutConfiguration {
        horizontalMonthPadding: number;
        verticalMonthPadding: number;
        calendarDateRectSize: number;
        monthTitleRatio: number,
        numberOfColumns: number,
        numberOfRows: number,
        numberOfMonths: number,
        svgWidth: number,
        svgHeight: number
    }

    export interface YearViewLayoutConfiguration {
        svgPadding: number;
        yearRectSize: number;
        numberOfColumns: number,
        numberOfRows: number,
        numberOfYears: number,
        svgWidth: number,
        svgHeight: number,
        yearTitleRatio: number
    }

    export interface YearDataPoint {
        yearIndex: number,
        year: number,
        value: number,
        color: string,
        //selectionId: visuals.ISelectionId;
    }

    export interface CalendarDataPoint {
        color: string;
        date: Date;
        value: number;
        selectionId: visuals.ISelectionId;
        month: number;
        year: number;
    };

    /** Manages date selections and zoom views */
    export class StateManager {
        private readonly selectionManager: ISelectionManager;
        private zoomLevel: ZoomLevel;
        private selectedMonth: Month;
        private selectedYear: number;

        /** anchor selected date for SHIFT clicking */
        public anchorSelection: Date;
        public lastClickedDate: Date;

        constructor(selectionManager: ISelectionManager) {
            this.selectionManager = selectionManager;
            this.setAnchor(null);
            this.setAllZoom();
        }

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


        getZoomLevel(): ZoomLevel {
             return this.zoomLevel;
         }
        setZoomLevel(zoomLevel: ZoomLevel) { 
            this.zoomLevel = zoomLevel;
        }

        setMonthZoom(zoomLevel: ZoomLevel, monthNumber: number, yearNumber: number){
            this.zoomLevel = ZoomLevel.MONTH;
            this.selectedMonth = monthNumber;
            this.selectedYear = yearNumber;
        }
        getSelectedMonth(): Month { 
            return this.selectedMonth;
        }
        getSelectedYear(): number { 
            return this.selectedYear;
        }

        setAllZoom() {
            this.zoomLevel = ZoomLevel.ALL;
            this.selectedMonth = null;
            this.selectedYear = null;
            this.setAnchor(null);
        }

        setAnchor(anchor: Date){
            this.anchorSelection = anchor;
        }

        getAnchor(){
            return this.anchorSelection;
        }

        setLastClickedDate(date: Date){
            this.lastClickedDate = date;
        }

        getLastClickedDate(){
            return this.lastClickedDate;
        }
    }

}