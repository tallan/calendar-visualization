module powerbi.extensibility.visual.CalendarVisualA45056645E4E428B9D26EF971839A6B5  {

    /**
     * @interface
     */
    export interface TooltipEventArgs<TData> {
        data: TData;
        coordinates: number[];
        elementCoordinates: number[];
        context: HTMLElement;
        isTouchEvent: boolean;
    }

    /**
     * @interface
     */
    export interface ITooltipServiceWrapper {
        addTooltip<T>(
            selection: d3.Selection<Element>,
            getTooltipInfoDelegate: (args: TooltipEventArgs<T>) => VisualTooltipDataItem[],
            getDataPointIdentity: (args: TooltipEventArgs<T>) => ISelectionId,
            reloadTooltipDataOnMouseMove?: boolean): void;
        hide(): void;
    }
    
    /**
     * Encapulates the ITooltipService.
     * @class
     */
    export class TooltipServiceWrapper implements ITooltipServiceWrapper {
        private handleTouchTimeoutId: number;
        private visualHostTooltipService: ITooltipService;
        private rootElement: Element;
        private handleTouchDelay: number;
        
        /**
         * Creates a new instance of TooltipServiceWrapper. 
         * @constructor
         * @param tooltipService    -tooltip service obtained from host
         * @param rootElement       -root element
         * @param handleTouchDelay  -touch delay in milliseconds
         */
        constructor(tooltipService: ITooltipService, rootElement: Element, handleTouchDelay: number = Default_Handle_Touch_Delay ) {
            this.visualHostTooltipService = tooltipService;
            this.handleTouchDelay = handleTouchDelay;
            this.rootElement = rootElement;
        }
        
        /**
         * Adds tooltip to selected element.
         * @method @public 
         * @param {d3.Selection<Element>} selection             -element to apply tooltip to.
         * @param {TooltipEventArgs<T>} getTooltipInfoDelegate  -delegate that retrieves tooltip info.
         * @param {TooltipEventArgs<T>} getDataPointIdentity    -delegate that retrieves datapoint identity.
         * @param {boolean} reloadTooltipDataOnMouseMove        -determines if tooltip data should reload when mouse moves.
         */
        public addTooltip<T>(
            selection: d3.Selection<Element>,
            getTooltipInfoDelegate: (args: TooltipEventArgs<T>) => VisualTooltipDataItem[],
            getDataPointIdentity: (args: TooltipEventArgs<T>) => ISelectionId,
            reloadTooltipDataOnMouseMove?: boolean): void {
            
            if (!selection || !this.visualHostTooltipService.enabled()) {
                return;
            }
            
            let rootNode = this.rootElement;

            // Mouse events
            selection.on("mouseover.tooltip", () => {
                // Ignore mouseover while handling touch events
                if (!this.canDisplayTooltip(d3.event))
                    return;

                let tooltipEventArgs = this.makeTooltipEventArgs<T>(rootNode, true, false);
                if (!tooltipEventArgs)
                    return;
                
                let tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                if (tooltipInfo == null)
                    return;
                    
                let selectionId = getDataPointIdentity(tooltipEventArgs);
                
                this.visualHostTooltipService.show({
                    coordinates: tooltipEventArgs.coordinates,
                    isTouchEvent: false,
                    dataItems: tooltipInfo,
                    identities: selectionId ? [selectionId] : [],
                });
            });

            selection.on("mouseout.tooltip", () => {
                this.visualHostTooltipService.hide({
                    isTouchEvent: false,
                    immediately: false,
                });
            });

            selection.on("mousemove.tooltip", () => {
                // Ignore mousemove while handling touch events
                if (!this.canDisplayTooltip(d3.event))
                    return;

                let tooltipEventArgs = this.makeTooltipEventArgs<T>(rootNode, true, false);
                if (!tooltipEventArgs)
                    return;
                
                let tooltipInfo: VisualTooltipDataItem[];
                if (reloadTooltipDataOnMouseMove) {
                    tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                    if (tooltipInfo == null)
                        return;
                }
                
                let selectionId = getDataPointIdentity(tooltipEventArgs);
                
                this.visualHostTooltipService.move({
                    coordinates: tooltipEventArgs.coordinates,
                    isTouchEvent: false,
                    dataItems: tooltipInfo,
                    identities: selectionId ? [selectionId] : [],
                });
            });

            // --- Touch events ---

            let touchStartEventName: string = TooltipServiceWrapper.touchStartEventName();
            let touchEndEventName: string = TooltipServiceWrapper.touchEndEventName();
            let isPointerEvent: boolean = TooltipServiceWrapper.usePointerEvents();

            selection.on(touchStartEventName + '.tooltip', () => {
                this.visualHostTooltipService.hide({
                    isTouchEvent: true,
                    immediately: true,
                });

                let tooltipEventArgs = this.makeTooltipEventArgs<T>(rootNode, isPointerEvent, true);
                if (!tooltipEventArgs)
                    return;
                
                let tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                let selectionId = getDataPointIdentity(tooltipEventArgs);
                
                this.visualHostTooltipService.show({
                    coordinates: tooltipEventArgs.coordinates,
                    isTouchEvent: true,
                    dataItems: tooltipInfo,
                    identities: selectionId ? [selectionId] : [],
                });
            });

            selection.on(touchEndEventName + '.tooltip', () => {
                this.visualHostTooltipService.hide({
                    isTouchEvent: true,
                    immediately: false,
                });

                if (this.handleTouchTimeoutId)
                    clearTimeout(this.handleTouchTimeoutId);

                // At the end of touch action, set a timeout that will let us ignore the incoming mouse events for a small amount of time
                // TODO: any better way to do this?
                this.handleTouchTimeoutId = setTimeout(() => {
                    this.handleTouchTimeoutId = undefined;
                }, this.handleTouchDelay);
            });
        }

        /**
         * Hides tooltip.
         * @method @public
         */
        public hide(): void {
            this.visualHostTooltipService.hide({ immediately: true, isTouchEvent: false });
        }

        /**
         * Creates and returns a tooltip delegate with a specific HTML Element target
         * @method @private
         * @param {Element} rootNode            -root node
         * @param {boolean} isPointerEvent      -true if is a pointer event, false otherwise
         * @param {boolean} isTouchEvent        -true if is a pointer event, false otherwise
         * @returns {TooltipEventArgs<T>}       -the created tooltip delegate
         */
        private makeTooltipEventArgs<T>(rootNode: Element, isPointerEvent: boolean, isTouchEvent: boolean): TooltipEventArgs<T> {
            let target = <HTMLElement>(<Event>d3.event).target;
            let data: T = d3.select(target).datum();

            let mouseCoordinates = this.getCoordinates(rootNode, isPointerEvent);
            let elementCoordinates: number[] = this.getCoordinates(target, isPointerEvent);
            let tooltipEventArgs: TooltipEventArgs<T> = {
                data: data,
                coordinates: mouseCoordinates,
                elementCoordinates: elementCoordinates,
                context: target,
                isTouchEvent: isTouchEvent
            };

            return tooltipEventArgs;
        }

        /**
         * Determines if a tooltip can be displayed during the given event
         * @method @private
         * @param {any} d3Event -any event
         * @returns {boolean}   -true if tooltip can be displayed for given event, false otherwise
         */
        private canDisplayTooltip(d3Event: any): boolean {
            let canDisplay: boolean = true;
            let mouseEvent: MouseEvent = <MouseEvent>d3Event;
            if (mouseEvent.buttons !== undefined) {
                // Check mouse buttons state
                let hasMouseButtonPressed = mouseEvent.buttons !== 0;
                canDisplay = !hasMouseButtonPressed;
            }
            
            // Make sure we are not ignoring mouse events immediately after touch end.
            canDisplay = canDisplay && (this.handleTouchTimeoutId == null);
            
            return canDisplay;
        }

        /**
         * Retrieves the coordinates for the selected element
         * @method @private
         * @param rootNode          -the selected element
         * @param isPointerEvent    -true if the event is a pointer event, false otherwise
         */
        private getCoordinates(rootNode: Element, isPointerEvent: boolean): number[] {
            let coordinates: number[];

            if (isPointerEvent) {
                // DO NOT USE - WebKit bug in getScreenCTM with nested SVG results in slight negative coordinate shift
                // Also, IE will incorporate transform scale but WebKit does not, forcing us to detect browser and adjust appropriately.
                // Just use non-scaled coordinates for all browsers, and adjust for the transform scale later (see lineChart.findIndex)
                //coordinates = d3.mouse(rootNode);

                // copied from d3_eventSource (which is not exposed)
                let e = <any>d3.event, s;
                while (s = e.sourceEvent) e = s;
                let rect = rootNode.getBoundingClientRect();
                coordinates = [e.clientX - rect.left - rootNode.clientLeft, e.clientY - rect.top - rootNode.clientTop];
            }
            else {
                let touchCoordinates = d3.touches(rootNode);
                if (touchCoordinates && touchCoordinates.length > 0) {
                    coordinates = touchCoordinates[0];
                }
            }

            return coordinates;
        }

        /**
         * Provides a name for a touch start event
         * @method @private
         * @returns {string}    -event name
         */
        private static touchStartEventName(): string {
            let eventName: string = "touchstart";

            if (window["PointerEvent"]) {
                // IE11
                eventName = "pointerdown";
            }

            return eventName;
        }

        /**
         * Provides a name for a touch move event
         * @method @private
         * @returns {string}    -event name
         */
        private static touchMoveEventName(): string {
            let eventName: string = "touchmove";

            if (window["PointerEvent"]) {
                // IE11
                eventName = "pointermove";
            }

            return eventName;
        }

        /**
         * Provides a name for a touch end event
         * @private @method
         * @returns {string}    -event name
         */
        private static touchEndEventName(): string {
            let eventName: string = "touchend";

            if (window["PointerEvent"]) {
                // IE11
                eventName = "pointerup";
            }

            return eventName;
        }
        
        /**
         * Determines if touch start event is a pointer event
         * @private @method
         * @returns {boolean}   -true if event is a pointer event, false otherwise
         */
        private static usePointerEvents(): boolean {
            let eventName = TooltipServiceWrapper.touchStartEventName();
            return eventName === "pointerdown" || eventName === "MSPointerDown";
        }
    }
}