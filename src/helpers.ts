module powerbi.extensibility.visual {

    /** The view model. Holds all data retrieved at every update cycle */
    export interface BetterCalendarViewModel {
        dateValuesByYear: { number: DateValue[] };  // {year: [dates]}
        yearsList: number[];
        dateValueTable: { string: DateValue };  // { date: DateValue } for quick access
        //eventOriginatedInVisual: boolean
    };

    /** Wrapper around a Date cell */
    export interface DateValue {
        color: string;
        date: Date;
        value: number;
        tooltipDataItems: VisualTooltipDataItem[];
        selectionId: visuals.ISelectionId;
    };

    /** Manages date selections and zoom views */
    export class StateManager {
        private readonly selectionManager: ISelectionManager;
        private readonly selectedDateValues: DateValue[];
        private zoomLevel: ZoomLevel;
        private selectedMonth: Month;
        private selectedYear: number;

        /** anchor selected date for SHIFT clicking */
        anchorSelection: DateValue;

        constructor(selectionManager: ISelectionManager) {
            this.selectionManager = selectionManager;
            this.selectedDateValues = [] as DateValue[];
            this.setAnchor(null);
            this.setAllZoom();
        }

        /** On click, select date to be added to existing selections */
        select(dateValue: DateValue, modifier: KeyMod, viewModel: BetterCalendarViewModel) {
            if (!this.isDateInData(dateValue)) {
                this.setAnchor(null);
                event.stopPropagation();
                this.assertSelections();
                return;
            }

            // based on Windows multi selection behaviors in Explorer GUI
            if (this.selectedDateValues.length > 0) {
                assert(this.anchorSelection !== null, 'ERROR: Anchor does not exist when it should');
            }
            if (modifier === KeyMod.NONE || modifier === KeyMod.CTRL || this.anchorSelection === null) {
                this.setAnchor(dateValue);
            }

            var selectionIdsToAdd: visuals.ISelectionId[] = [];
            if (modifier === KeyMod.NONE || modifier === KeyMod.CTRL) {
                // Note: selection manager doesn't seem to add anything on top of existing selections
                // So make list of all currently selected dates to re-add
                this.selectedDateValues.push(dateValue);
                selectionIdsToAdd = this.buildSelectedSelectionIds();
            } else if (modifier === KeyMod.SHIFT) {
                // Get Min and Max Selected dates selected via anchor and current Shift select
                let anchorDateValue: DateValue = this.getAnchor();
                let shiftDateValue: DateValue = dateValue;
                let maxDate: Date;
                let minDate: Date;
                if (anchorDateValue.date < shiftDateValue.date) {
                    maxDate = shiftDateValue.date;
                    minDate = anchorDateValue.date;
                }
                else {
                    maxDate = anchorDateValue.date;
                    minDate = shiftDateValue.date;
                }

                let allValueDates = viewModel.dateValueTable;
                for (let key in allValueDates) {
                    if (allValueDates[key].date >= minDate && allValueDates[key].date <= maxDate) {
                        this.selectedDateValues.push(allValueDates[key]);
                    };
                }

                selectionIdsToAdd = this.buildSelectedSelectionIds();
            }
            
            return this.makeSelection(selectionIdsToAdd).then(() => {
                event.stopPropagation();
            });
        }

        private makeSelection(selectionIds: visuals.ISelectionId[]) {
            var promise = this.selectionManager.select(selectionIds);

            return promise.then(() => {
                this.assertSelections();
            });
        }

        /** Select all of dates for month for month zoom view. Clears selectedDateValues, selects
         *  dates for selection manager, does not render strokes */
        selectMonth(viewModel: BetterCalendarViewModel, selectedMonth?: Month, selectedYear?: number) {
            // clear selectedDateValues
            while (this.selectedDateValues.length)
                this.selectedDateValues.pop();

            if (this.zoomLevel === ZoomLevel.MONTH) {
                assert(this.selectedMonth !== null && this.selectedYear !== null, 'ERROR: month zoom needs month and year');
            } else {
                this.zoomLevel = ZoomLevel.MONTH;
                this.selectedMonth = (selectedMonth !== undefined) ? selectedMonth : this.selectedMonth;
                this.selectedYear = (selectedYear !== undefined) ? selectedYear : this.selectedYear;
                this.setAnchor(null);
            }

            const dateValues: DateValue[] = viewModel.dateValuesByYear[this.selectedYear];
            if (!dateValues)
                return;

            const datesOfMonth = dateValues.filter((dv) => dv.date.getMonth() === this.selectedMonth);
            return this.makeSelection(this.buildSelectedSelectionIds(datesOfMonth));
        }

        /** CTRL clicking on a selected date. Updates anchor to this. */
        unSelect(date: Date, viewModel: BetterCalendarViewModel) {
            const dateValue: DateValue = viewModel.dateValueTable[date.toString()];
            assert(dateValue !== undefined, 'ERROR: dateValue to be unselected is not in data');

            // same as Windows Explorer GUI behavior
            this.setAnchor(dateValue);

            if (this.selectedDateValues.length === 1) {
                this.clearSelections();
                if (this.zoomLevel === ZoomLevel.MONTH)
                    this.selectMonth(viewModel, this.selectedMonth, this.selectedYear);
                return;
            }

            // remove from selectedDateValues
            const dateValueIndex = this.selectedDateValues.indexOf(dateValue);
            assert(dateValueIndex > -1, 'ERROR: dateValue to be unselected is not selected');
            this.selectedDateValues.splice(dateValueIndex, 1);

            // select all dates again without date arg
            const selectionIdsToReAdd = this.buildSelectedSelectionIds();
            return this.makeSelection(selectionIdsToReAdd);
        }

        /** Clear selectedDateValues and selection manager. Does not clear anchor */
        clearSelections() {
            // clear selectedDateValues
            while (this.selectedDateValues.length)
                this.selectedDateValues.pop();

            // clear manager
            this.selectionManager.clear().then(() => {
                this.assertSelections();
            });
        }

        isDateInData(dateValue: DateValue): boolean {
            return dateValue !== undefined && dateValue !== null
                && dateValue.selectionId !== undefined && dateValue.selectionId !== null;
        }

        /** Does DateValue exist in selectedDateValues only */
        isDateSelected(date: Date, viewModel: BetterCalendarViewModel): boolean {
            const dateValue: DateValue = viewModel.dateValueTable[date.toString()];
            if (dateValue && dateValue.selectionId && this.selectedDateValues.length > 0) {
                const dateIdKey = dateValue.selectionId.getKey();
                for (let selected of this.selectedDateValues) {
                    if (selected.selectionId && selected.selectionId.getKey() === dateIdKey) {
                        return true;
                    }
                }
            }
            return false;
        }

        getDaysInMonthBySelectedMonth(month: number, year: number, viewModel: BetterCalendarViewModel) {
            const dates: { selectedDays: Date[], unselectedDays: Date[] } = {
                selectedDays: [],
                unselectedDays: []
            };

            var date = new Date(year, month, 1);
            while (date.getMonth() === month) {
                if (this.isDateSelected(date, viewModel)) {
                    dates.selectedDays.push(new Date(date));
                } else {
                    dates.unselectedDays.push(new Date(date));
                }
                date.setDate(date.getDate() + 1);
            }

            return dates;
        }

        getZoomLevel(): ZoomLevel { return this.zoomLevel; }
        getSelectedMonth(): Month { return this.selectedMonth; }
        getSelectedYear(): number { return this.selectedYear; }
        hasActiveSelection(): boolean { return this.selectionManager.hasSelection(); }
        activeSelectionCount(): number { return this.selectedDateValues.length; }

        setAllZoom() {
            this.zoomLevel = ZoomLevel.ALL;
            this.selectedMonth = null;
            this.selectedYear = null;
            this.setAnchor(null);
        }

        setAnchor(anchor: DateValue) {
            if (this.anchorSelection === null && anchor === null)
                return;
            this.anchorSelection = anchor;
        }

        getAnchor() {
            return this.anchorSelection;
        }

        private buildSelectedSelectionIds(dateValues?: DateValue[]): visuals.ISelectionId[] {
            if (!dateValues)
                dateValues = this.selectedDateValues;
            const selectionIds: visuals.ISelectionId[] = [];
            for (let dv of dateValues) {
                assert(dv.selectionId !== undefined || dv.selectionId !== null);
                selectionIds.push(dv.selectionId);
            }
            return selectionIds;
        }

        /** for debugging */
        private assertSelections() {
            // console.log(this.selectedDateValues.length + ' selected');

            // in month zoom, nothing selected requires all of dates to be selected in selection manager
            if (this.zoomLevel === ZoomLevel.MONTH) return;

            assert(this.selectedDateValues.length === this.selectionManager.getSelectionIds().length,
                'ERROR: selection lengths don"t match: DateValues=${dvLen}, selectionIds=${selectionIdsLen}');
        }
    }

    /** Debug function in lieu of unit testing */
    export function assert(expression: boolean, msg = 'ERROR: An assertion failed') {
        try { if (!expression) throw msg; }
        catch (e) { console.log(e); }
    }
}