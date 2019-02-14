//     Underscore.js 1.9.1
//     http://underscorejs.org
//     (c) 2009-2018 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
(function () {
    // Baseline setup
    // --------------
    // Establish the root object, `window` (`self`) in the browser, `global`
    // on the server, or `this` in some virtual machines. We use `self`
    // instead of `window` for `WebWorker` support.
    var root = typeof self == 'object' && self.self === self && self ||
        typeof global == 'object' && global.global === global && global ||
        this ||
        {};
    // Save the previous value of the `_` variable.
    var previousUnderscore = root._;
    // Save bytes in the minified (but not gzipped) version:
    var ArrayProto = Array.prototype, ObjProto = Object.prototype;
    var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;
    // Create quick reference variables for speed access to core prototypes.
    var push = ArrayProto.push, slice = ArrayProto.slice, toString = ObjProto.toString, hasOwnProperty = ObjProto.hasOwnProperty;
    // All **ECMAScript 5** native function implementations that we hope to use
    // are declared here.
    var nativeIsArray = Array.isArray, nativeKeys = Object.keys, nativeCreate = Object.create;
    // Naked function reference for surrogate-prototype-swapping.
    var Ctor = function () { };
    // Create a safe reference to the Underscore object for use below.
    var _ = function (obj) {
        if (obj instanceof _)
            return obj;
        if (!(this instanceof _))
            return new _(obj);
        this._wrapped = obj;
    };
    // Export the Underscore object for **Node.js**, with
    // backwards-compatibility for their old module API. If we're in
    // the browser, add `_` as a global object.
    // (`nodeType` is checked to ensure that `module`
    // and `exports` are not HTML elements.)
    if (typeof exports != 'undefined' && !exports.nodeType) {
        if (typeof module != 'undefined' && !module.nodeType && module.exports) {
            exports = module.exports = _;
        }
        exports._ = _;
    }
    else {
        root._ = _;
    }
    // Current version.
    _.VERSION = '1.9.1';
    // Internal function that returns an efficient (for current engines) version
    // of the passed-in callback, to be repeatedly applied in other Underscore
    // functions.
    var optimizeCb = function (func, context, argCount) {
        if (context === void 0)
            return func;
        switch (argCount == null ? 3 : argCount) {
            case 1: return function (value) {
                return func.call(context, value);
            };
            // The 2-argument case is omitted because we’re not using it.
            case 3: return function (value, index, collection) {
                return func.call(context, value, index, collection);
            };
            case 4: return function (accumulator, value, index, collection) {
                return func.call(context, accumulator, value, index, collection);
            };
        }
        return function () {
            return func.apply(context, arguments);
        };
    };
    var builtinIteratee;
    // An internal function to generate callbacks that can be applied to each
    // element in a collection, returning the desired result — either `identity`,
    // an arbitrary callback, a property matcher, or a property accessor.
    var cb = function (value, context, argCount) {
        if (_.iteratee !== builtinIteratee)
            return _.iteratee(value, context);
        if (value == null)
            return _.identity;
        if (_.isFunction(value))
            return optimizeCb(value, context, argCount);
        if (_.isObject(value) && !_.isArray(value))
            return _.matcher(value);
        return _.property(value);
    };
    // External wrapper for our callback generator. Users may customize
    // `_.iteratee` if they want additional predicate/iteratee shorthand styles.
    // This abstraction hides the internal-only argCount argument.
    _.iteratee = builtinIteratee = function (value, context) {
        return cb(value, context, Infinity);
    };
    // Some functions take a variable number of arguments, or a few expected
    // arguments at the beginning and then a variable number of values to operate
    // on. This helper accumulates all remaining arguments past the function’s
    // argument length (or an explicit `startIndex`), into an array that becomes
    // the last argument. Similar to ES6’s "rest parameter".
    var restArguments = function (func, startIndex) {
        startIndex = startIndex == null ? func.length - 1 : +startIndex;
        return function () {
            var length = Math.max(arguments.length - startIndex, 0), rest = Array(length), index = 0;
            for (; index < length; index++) {
                rest[index] = arguments[index + startIndex];
            }
            switch (startIndex) {
                case 0: return func.call(this, rest);
                case 1: return func.call(this, arguments[0], rest);
                case 2: return func.call(this, arguments[0], arguments[1], rest);
            }
            var args = Array(startIndex + 1);
            for (index = 0; index < startIndex; index++) {
                args[index] = arguments[index];
            }
            args[startIndex] = rest;
            return func.apply(this, args);
        };
    };
    // An internal function for creating a new object that inherits from another.
    var baseCreate = function (prototype) {
        if (!_.isObject(prototype))
            return {};
        if (nativeCreate)
            return nativeCreate(prototype);
        Ctor.prototype = prototype;
        var result = new Ctor;
        Ctor.prototype = null;
        return result;
    };
    var shallowProperty = function (key) {
        return function (obj) {
            return obj == null ? void 0 : obj[key];
        };
    };
    var has = function (obj, path) {
        return obj != null && hasOwnProperty.call(obj, path);
    };
    var deepGet = function (obj, path) {
        var length = path.length;
        for (var i = 0; i < length; i++) {
            if (obj == null)
                return void 0;
            obj = obj[path[i]];
        }
        return length ? obj : void 0;
    };
    // Helper for collection methods to determine whether a collection
    // should be iterated as an array or as an object.
    // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
    // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
    var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
    var getLength = shallowProperty('length');
    var isArrayLike = function (collection) {
        var length = getLength(collection);
        return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
    };
    // Collection Functions
    // --------------------
    // The cornerstone, an `each` implementation, aka `forEach`.
    // Handles raw objects in addition to array-likes. Treats all
    // sparse array-likes as if they were dense.
    _.each = _.forEach = function (obj, iteratee, context) {
        iteratee = optimizeCb(iteratee, context);
        var i, length;
        if (isArrayLike(obj)) {
            for (i = 0, length = obj.length; i < length; i++) {
                iteratee(obj[i], i, obj);
            }
        }
        else {
            var keys = _.keys(obj);
            for (i = 0, length = keys.length; i < length; i++) {
                iteratee(obj[keys[i]], keys[i], obj);
            }
        }
        return obj;
    };
    // Return the results of applying the iteratee to each element.
    _.map = _.collect = function (obj, iteratee, context) {
        iteratee = cb(iteratee, context);
        var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length, results = Array(length);
        for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            results[index] = iteratee(obj[currentKey], currentKey, obj);
        }
        return results;
    };
    // Create a reducing function iterating left or right.
    var createReduce = function (dir) {
        // Wrap code that reassigns argument variables in a separate function than
        // the one that accesses `arguments.length` to avoid a perf hit. (#1991)
        var reducer = function (obj, iteratee, memo, initial) {
            var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length, index = dir > 0 ? 0 : length - 1;
            if (!initial) {
                memo = obj[keys ? keys[index] : index];
                index += dir;
            }
            for (; index >= 0 && index < length; index += dir) {
                var currentKey = keys ? keys[index] : index;
                memo = iteratee(memo, obj[currentKey], currentKey, obj);
            }
            return memo;
        };
        return function (obj, iteratee, memo, context) {
            var initial = arguments.length >= 3;
            return reducer(obj, optimizeCb(iteratee, context, 4), memo, initial);
        };
    };
    // **Reduce** builds up a single result from a list of values, aka `inject`,
    // or `foldl`.
    _.reduce = _.foldl = _.inject = createReduce(1);
    // The right-associative version of reduce, also known as `foldr`.
    _.reduceRight = _.foldr = createReduce(-1);
    // Return the first value which passes a truth test. Aliased as `detect`.
    _.find = _.detect = function (obj, predicate, context) {
        var keyFinder = isArrayLike(obj) ? _.findIndex : _.findKey;
        var key = keyFinder(obj, predicate, context);
        if (key !== void 0 && key !== -1)
            return obj[key];
    };
    // Return all the elements that pass a truth test.
    // Aliased as `select`.
    _.filter = _.select = function (obj, predicate, context) {
        var results = [];
        predicate = cb(predicate, context);
        _.each(obj, function (value, index, list) {
            if (predicate(value, index, list))
                results.push(value);
        });
        return results;
    };
    // Return all the elements for which a truth test fails.
    _.reject = function (obj, predicate, context) {
        return _.filter(obj, _.negate(cb(predicate)), context);
    };
    // Determine whether all of the elements match a truth test.
    // Aliased as `all`.
    _.every = _.all = function (obj, predicate, context) {
        predicate = cb(predicate, context);
        var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length;
        for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            if (!predicate(obj[currentKey], currentKey, obj))
                return false;
        }
        return true;
    };
    // Determine if at least one element in the object matches a truth test.
    // Aliased as `any`.
    _.some = _.any = function (obj, predicate, context) {
        predicate = cb(predicate, context);
        var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length;
        for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            if (predicate(obj[currentKey], currentKey, obj))
                return true;
        }
        return false;
    };
    // Determine if the array or object contains a given item (using `===`).
    // Aliased as `includes` and `include`.
    _.contains = _.includes = _.include = function (obj, item, fromIndex, guard) {
        if (!isArrayLike(obj))
            obj = _.values(obj);
        if (typeof fromIndex != 'number' || guard)
            fromIndex = 0;
        return _.indexOf(obj, item, fromIndex) >= 0;
    };
    // Invoke a method (with arguments) on every item in a collection.
    _.invoke = restArguments(function (obj, path, args) {
        var contextPath, func;
        if (_.isFunction(path)) {
            func = path;
        }
        else if (_.isArray(path)) {
            contextPath = path.slice(0, -1);
            path = path[path.length - 1];
        }
        return _.map(obj, function (context) {
            var method = func;
            if (!method) {
                if (contextPath && contextPath.length) {
                    context = deepGet(context, contextPath);
                }
                if (context == null)
                    return void 0;
                method = context[path];
            }
            return method == null ? method : method.apply(context, args);
        });
    });
    // Convenience version of a common use case of `map`: fetching a property.
    _.pluck = function (obj, key) {
        return _.map(obj, _.property(key));
    };
    // Convenience version of a common use case of `filter`: selecting only objects
    // containing specific `key:value` pairs.
    _.where = function (obj, attrs) {
        return _.filter(obj, _.matcher(attrs));
    };
    // Convenience version of a common use case of `find`: getting the first object
    // containing specific `key:value` pairs.
    _.findWhere = function (obj, attrs) {
        return _.find(obj, _.matcher(attrs));
    };
    // Return the maximum element (or element-based computation).
    _.max = function (obj, iteratee, context) {
        var result = -Infinity, lastComputed = -Infinity, value, computed;
        if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
            obj = isArrayLike(obj) ? obj : _.values(obj);
            for (var i = 0, length = obj.length; i < length; i++) {
                value = obj[i];
                if (value != null && value > result) {
                    result = value;
                }
            }
        }
        else {
            iteratee = cb(iteratee, context);
            _.each(obj, function (v, index, list) {
                computed = iteratee(v, index, list);
                if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
                    result = v;
                    lastComputed = computed;
                }
            });
        }
        return result;
    };
    // Return the minimum element (or element-based computation).
    _.min = function (obj, iteratee, context) {
        var result = Infinity, lastComputed = Infinity, value, computed;
        if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
            obj = isArrayLike(obj) ? obj : _.values(obj);
            for (var i = 0, length = obj.length; i < length; i++) {
                value = obj[i];
                if (value != null && value < result) {
                    result = value;
                }
            }
        }
        else {
            iteratee = cb(iteratee, context);
            _.each(obj, function (v, index, list) {
                computed = iteratee(v, index, list);
                if (computed < lastComputed || computed === Infinity && result === Infinity) {
                    result = v;
                    lastComputed = computed;
                }
            });
        }
        return result;
    };
    // Shuffle a collection.
    _.shuffle = function (obj) {
        return _.sample(obj, Infinity);
    };
    // Sample **n** random values from a collection using the modern version of the
    // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
    // If **n** is not specified, returns a single random element.
    // The internal `guard` argument allows it to work with `map`.
    _.sample = function (obj, n, guard) {
        if (n == null || guard) {
            if (!isArrayLike(obj))
                obj = _.values(obj);
            return obj[_.random(obj.length - 1)];
        }
        var sample = isArrayLike(obj) ? _.clone(obj) : _.values(obj);
        var length = getLength(sample);
        n = Math.max(Math.min(n, length), 0);
        var last = length - 1;
        for (var index = 0; index < n; index++) {
            var rand = _.random(index, last);
            var temp = sample[index];
            sample[index] = sample[rand];
            sample[rand] = temp;
        }
        return sample.slice(0, n);
    };
    // Sort the object's values by a criterion produced by an iteratee.
    _.sortBy = function (obj, iteratee, context) {
        var index = 0;
        iteratee = cb(iteratee, context);
        return _.pluck(_.map(obj, function (value, key, list) {
            return {
                value: value,
                index: index++,
                criteria: iteratee(value, key, list)
            };
        }).sort(function (left, right) {
            var a = left.criteria;
            var b = right.criteria;
            if (a !== b) {
                if (a > b || a === void 0)
                    return 1;
                if (a < b || b === void 0)
                    return -1;
            }
            return left.index - right.index;
        }), 'value');
    };
    // An internal function used for aggregate "group by" operations.
    var group = function (behavior, partition) {
        return function (obj, iteratee, context) {
            var result = partition ? [[], []] : {};
            iteratee = cb(iteratee, context);
            _.each(obj, function (value, index) {
                var key = iteratee(value, index, obj);
                behavior(result, value, key);
            });
            return result;
        };
    };
    // Groups the object's values by a criterion. Pass either a string attribute
    // to group by, or a function that returns the criterion.
    _.groupBy = group(function (result, value, key) {
        if (has(result, key))
            result[key].push(value);
        else
            result[key] = [value];
    });
    // Indexes the object's values by a criterion, similar to `groupBy`, but for
    // when you know that your index values will be unique.
    _.indexBy = group(function (result, value, key) {
        result[key] = value;
    });
    // Counts instances of an object that group by a certain criterion. Pass
    // either a string attribute to count by, or a function that returns the
    // criterion.
    _.countBy = group(function (result, value, key) {
        if (has(result, key))
            result[key]++;
        else
            result[key] = 1;
    });
    var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
    // Safely create a real, live array from anything iterable.
    _.toArray = function (obj) {
        if (!obj)
            return [];
        if (_.isArray(obj))
            return slice.call(obj);
        if (_.isString(obj)) {
            // Keep surrogate pair characters together
            return obj.match(reStrSymbol);
        }
        if (isArrayLike(obj))
            return _.map(obj, _.identity);
        return _.values(obj);
    };
    // Return the number of elements in an object.
    _.size = function (obj) {
        if (obj == null)
            return 0;
        return isArrayLike(obj) ? obj.length : _.keys(obj).length;
    };
    // Split a collection into two arrays: one whose elements all satisfy the given
    // predicate, and one whose elements all do not satisfy the predicate.
    _.partition = group(function (result, value, pass) {
        result[pass ? 0 : 1].push(value);
    }, true);
    // Array Functions
    // ---------------
    // Get the first element of an array. Passing **n** will return the first N
    // values in the array. Aliased as `head` and `take`. The **guard** check
    // allows it to work with `_.map`.
    _.first = _.head = _.take = function (array, n, guard) {
        if (array == null || array.length < 1)
            return n == null ? void 0 : [];
        if (n == null || guard)
            return array[0];
        return _.initial(array, array.length - n);
    };
    // Returns everything but the last entry of the array. Especially useful on
    // the arguments object. Passing **n** will return all the values in
    // the array, excluding the last N.
    _.initial = function (array, n, guard) {
        return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
    };
    // Get the last element of an array. Passing **n** will return the last N
    // values in the array.
    _.last = function (array, n, guard) {
        if (array == null || array.length < 1)
            return n == null ? void 0 : [];
        if (n == null || guard)
            return array[array.length - 1];
        return _.rest(array, Math.max(0, array.length - n));
    };
    // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
    // Especially useful on the arguments object. Passing an **n** will return
    // the rest N values in the array.
    _.rest = _.tail = _.drop = function (array, n, guard) {
        return slice.call(array, n == null || guard ? 1 : n);
    };
    // Trim out all falsy values from an array.
    _.compact = function (array) {
        return _.filter(array, Boolean);
    };
    // Internal implementation of a recursive `flatten` function.
    var flatten = function (input, shallow, strict, output) {
        output = output || [];
        var idx = output.length;
        for (var i = 0, length = getLength(input); i < length; i++) {
            var value = input[i];
            if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
                // Flatten current level of array or arguments object.
                if (shallow) {
                    var j = 0, len = value.length;
                    while (j < len)
                        output[idx++] = value[j++];
                }
                else {
                    flatten(value, shallow, strict, output);
                    idx = output.length;
                }
            }
            else if (!strict) {
                output[idx++] = value;
            }
        }
        return output;
    };
    // Flatten out an array, either recursively (by default), or just one level.
    _.flatten = function (array, shallow) {
        return flatten(array, shallow, false);
    };
    // Return a version of the array that does not contain the specified value(s).
    _.without = restArguments(function (array, otherArrays) {
        return _.difference(array, otherArrays);
    });
    // Produce a duplicate-free version of the array. If the array has already
    // been sorted, you have the option of using a faster algorithm.
    // The faster algorithm will not work with an iteratee if the iteratee
    // is not a one-to-one function, so providing an iteratee will disable
    // the faster algorithm.
    // Aliased as `unique`.
    _.uniq = _.unique = function (array, isSorted, iteratee, context) {
        if (!_.isBoolean(isSorted)) {
            context = iteratee;
            iteratee = isSorted;
            isSorted = false;
        }
        if (iteratee != null)
            iteratee = cb(iteratee, context);
        var result = [];
        var seen = [];
        for (var i = 0, length = getLength(array); i < length; i++) {
            var value = array[i], computed = iteratee ? iteratee(value, i, array) : value;
            if (isSorted && !iteratee) {
                if (!i || seen !== computed)
                    result.push(value);
                seen = computed;
            }
            else if (iteratee) {
                if (!_.contains(seen, computed)) {
                    seen.push(computed);
                    result.push(value);
                }
            }
            else if (!_.contains(result, value)) {
                result.push(value);
            }
        }
        return result;
    };
    // Produce an array that contains the union: each distinct element from all of
    // the passed-in arrays.
    _.union = restArguments(function (arrays) {
        return _.uniq(flatten(arrays, true, true));
    });
    // Produce an array that contains every item shared between all the
    // passed-in arrays.
    _.intersection = function (array) {
        var result = [];
        var argsLength = arguments.length;
        for (var i = 0, length = getLength(array); i < length; i++) {
            var item = array[i];
            if (_.contains(result, item))
                continue;
            var j;
            for (j = 1; j < argsLength; j++) {
                if (!_.contains(arguments[j], item))
                    break;
            }
            if (j === argsLength)
                result.push(item);
        }
        return result;
    };
    // Take the difference between one array and a number of other arrays.
    // Only the elements present in just the first array will remain.
    _.difference = restArguments(function (array, rest) {
        rest = flatten(rest, true, true);
        return _.filter(array, function (value) {
            return !_.contains(rest, value);
        });
    });
    // Complement of _.zip. Unzip accepts an array of arrays and groups
    // each array's elements on shared indices.
    _.unzip = function (array) {
        var length = array && _.max(array, getLength).length || 0;
        var result = Array(length);
        for (var index = 0; index < length; index++) {
            result[index] = _.pluck(array, index);
        }
        return result;
    };
    // Zip together multiple lists into a single array -- elements that share
    // an index go together.
    _.zip = restArguments(_.unzip);
    // Converts lists into objects. Pass either a single array of `[key, value]`
    // pairs, or two parallel arrays of the same length -- one of keys, and one of
    // the corresponding values. Passing by pairs is the reverse of _.pairs.
    _.object = function (list, values) {
        var result = {};
        for (var i = 0, length = getLength(list); i < length; i++) {
            if (values) {
                result[list[i]] = values[i];
            }
            else {
                result[list[i][0]] = list[i][1];
            }
        }
        return result;
    };
    // Generator function to create the findIndex and findLastIndex functions.
    var createPredicateIndexFinder = function (dir) {
        return function (array, predicate, context) {
            predicate = cb(predicate, context);
            var length = getLength(array);
            var index = dir > 0 ? 0 : length - 1;
            for (; index >= 0 && index < length; index += dir) {
                if (predicate(array[index], index, array))
                    return index;
            }
            return -1;
        };
    };
    // Returns the first index on an array-like that passes a predicate test.
    _.findIndex = createPredicateIndexFinder(1);
    _.findLastIndex = createPredicateIndexFinder(-1);
    // Use a comparator function to figure out the smallest index at which
    // an object should be inserted so as to maintain order. Uses binary search.
    _.sortedIndex = function (array, obj, iteratee, context) {
        iteratee = cb(iteratee, context, 1);
        var value = iteratee(obj);
        var low = 0, high = getLength(array);
        while (low < high) {
            var mid = Math.floor((low + high) / 2);
            if (iteratee(array[mid]) < value)
                low = mid + 1;
            else
                high = mid;
        }
        return low;
    };
    // Generator function to create the indexOf and lastIndexOf functions.
    var createIndexFinder = function (dir, predicateFind, sortedIndex) {
        return function (array, item, idx) {
            var i = 0, length = getLength(array);
            if (typeof idx == 'number') {
                if (dir > 0) {
                    i = idx >= 0 ? idx : Math.max(idx + length, i);
                }
                else {
                    length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
                }
            }
            else if (sortedIndex && idx && length) {
                idx = sortedIndex(array, item);
                return array[idx] === item ? idx : -1;
            }
            if (item !== item) {
                idx = predicateFind(slice.call(array, i, length), _.isNaN);
                return idx >= 0 ? idx + i : -1;
            }
            for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
                if (array[idx] === item)
                    return idx;
            }
            return -1;
        };
    };
    // Return the position of the first occurrence of an item in an array,
    // or -1 if the item is not included in the array.
    // If the array is large and already in sort order, pass `true`
    // for **isSorted** to use binary search.
    _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
    _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);
    // Generate an integer Array containing an arithmetic progression. A port of
    // the native Python `range()` function. See
    // [the Python documentation](http://docs.python.org/library/functions.html#range).
    _.range = function (start, stop, step) {
        if (stop == null) {
            stop = start || 0;
            start = 0;
        }
        if (!step) {
            step = stop < start ? -1 : 1;
        }
        var length = Math.max(Math.ceil((stop - start) / step), 0);
        var range = Array(length);
        for (var idx = 0; idx < length; idx++, start += step) {
            range[idx] = start;
        }
        return range;
    };
    // Chunk a single array into multiple arrays, each containing `count` or fewer
    // items.
    _.chunk = function (array, count) {
        if (count == null || count < 1)
            return [];
        var result = [];
        var i = 0, length = array.length;
        while (i < length) {
            result.push(slice.call(array, i, i += count));
        }
        return result;
    };
    // Function (ahem) Functions
    // ------------------
    // Determines whether to execute a function as a constructor
    // or a normal function with the provided arguments.
    var executeBound = function (sourceFunc, boundFunc, context, callingContext, args) {
        if (!(callingContext instanceof boundFunc))
            return sourceFunc.apply(context, args);
        var self = baseCreate(sourceFunc.prototype);
        var result = sourceFunc.apply(self, args);
        if (_.isObject(result))
            return result;
        return self;
    };
    // Create a function bound to a given object (assigning `this`, and arguments,
    // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
    // available.
    _.bind = restArguments(function (func, context, args) {
        if (!_.isFunction(func))
            throw new TypeError('Bind must be called on a function');
        var bound = restArguments(function (callArgs) {
            return executeBound(func, bound, context, this, args.concat(callArgs));
        });
        return bound;
    });
    // Partially apply a function by creating a version that has had some of its
    // arguments pre-filled, without changing its dynamic `this` context. _ acts
    // as a placeholder by default, allowing any combination of arguments to be
    // pre-filled. Set `_.partial.placeholder` for a custom placeholder argument.
    _.partial = restArguments(function (func, boundArgs) {
        var placeholder = _.partial.placeholder;
        var bound = function () {
            var position = 0, length = boundArgs.length;
            var args = Array(length);
            for (var i = 0; i < length; i++) {
                args[i] = boundArgs[i] === placeholder ? arguments[position++] : boundArgs[i];
            }
            while (position < arguments.length)
                args.push(arguments[position++]);
            return executeBound(func, bound, this, this, args);
        };
        return bound;
    });
    _.partial.placeholder = _;
    // Bind a number of an object's methods to that object. Remaining arguments
    // are the method names to be bound. Useful for ensuring that all callbacks
    // defined on an object belong to it.
    _.bindAll = restArguments(function (obj, keys) {
        keys = flatten(keys, false, false);
        var index = keys.length;
        if (index < 1)
            throw new Error('bindAll must be passed function names');
        while (index--) {
            var key = keys[index];
            obj[key] = _.bind(obj[key], obj);
        }
    });
    // Memoize an expensive function by storing its results.
    _.memoize = function (func, hasher) {
        var memoize = function (key) {
            var cache = memoize.cache;
            var address = '' + (hasher ? hasher.apply(this, arguments) : key);
            if (!has(cache, address))
                cache[address] = func.apply(this, arguments);
            return cache[address];
        };
        memoize.cache = {};
        return memoize;
    };
    // Delays a function for the given number of milliseconds, and then calls
    // it with the arguments supplied.
    _.delay = restArguments(function (func, wait, args) {
        return setTimeout(function () {
            return func.apply(null, args);
        }, wait);
    });
    // Defers a function, scheduling it to run after the current call stack has
    // cleared.
    _.defer = _.partial(_.delay, _, 1);
    // Returns a function, that, when invoked, will only be triggered at most once
    // during a given window of time. Normally, the throttled function will run
    // as much as it can, without ever going more than once per `wait` duration;
    // but if you'd like to disable the execution on the leading edge, pass
    // `{leading: false}`. To disable execution on the trailing edge, ditto.
    _.throttle = function (func, wait, options) {
        var timeout, context, args, result;
        var previous = 0;
        if (!options)
            options = {};
        var later = function () {
            previous = options.leading === false ? 0 : _.now();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout)
                context = args = null;
        };
        var throttled = function () {
            var now = _.now();
            if (!previous && options.leading === false)
                previous = now;
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                result = func.apply(context, args);
                if (!timeout)
                    context = args = null;
            }
            else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
            }
            return result;
        };
        throttled.cancel = function () {
            clearTimeout(timeout);
            previous = 0;
            timeout = context = args = null;
        };
        return throttled;
    };
    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    _.debounce = function (func, wait, immediate) {
        var timeout, result;
        var later = function (context, args) {
            timeout = null;
            if (args)
                result = func.apply(context, args);
        };
        var debounced = restArguments(function (args) {
            if (timeout)
                clearTimeout(timeout);
            if (immediate) {
                var callNow = !timeout;
                timeout = setTimeout(later, wait);
                if (callNow)
                    result = func.apply(this, args);
            }
            else {
                timeout = _.delay(later, wait, this, args);
            }
            return result;
        });
        debounced.cancel = function () {
            clearTimeout(timeout);
            timeout = null;
        };
        return debounced;
    };
    // Returns the first function passed as an argument to the second,
    // allowing you to adjust arguments, run code before and after, and
    // conditionally execute the original function.
    _.wrap = function (func, wrapper) {
        return _.partial(wrapper, func);
    };
    // Returns a negated version of the passed-in predicate.
    _.negate = function (predicate) {
        return function () {
            return !predicate.apply(this, arguments);
        };
    };
    // Returns a function that is the composition of a list of functions, each
    // consuming the return value of the function that follows.
    _.compose = function () {
        var args = arguments;
        var start = args.length - 1;
        return function () {
            var i = start;
            var result = args[start].apply(this, arguments);
            while (i--)
                result = args[i].call(this, result);
            return result;
        };
    };
    // Returns a function that will only be executed on and after the Nth call.
    _.after = function (times, func) {
        return function () {
            if (--times < 1) {
                return func.apply(this, arguments);
            }
        };
    };
    // Returns a function that will only be executed up to (but not including) the Nth call.
    _.before = function (times, func) {
        var memo;
        return function () {
            if (--times > 0) {
                memo = func.apply(this, arguments);
            }
            if (times <= 1)
                func = null;
            return memo;
        };
    };
    // Returns a function that will be executed at most one time, no matter how
    // often you call it. Useful for lazy initialization.
    _.once = _.partial(_.before, 2);
    _.restArguments = restArguments;
    // Object Functions
    // ----------------
    // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
    var hasEnumBug = !{ toString: null }.propertyIsEnumerable('toString');
    var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
        'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];
    var collectNonEnumProps = function (obj, keys) {
        var nonEnumIdx = nonEnumerableProps.length;
        var constructor = obj.constructor;
        var proto = _.isFunction(constructor) && constructor.prototype || ObjProto;
        // Constructor is a special case.
        var prop = 'constructor';
        if (has(obj, prop) && !_.contains(keys, prop))
            keys.push(prop);
        while (nonEnumIdx--) {
            prop = nonEnumerableProps[nonEnumIdx];
            if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
                keys.push(prop);
            }
        }
    };
    // Retrieve the names of an object's own properties.
    // Delegates to **ECMAScript 5**'s native `Object.keys`.
    _.keys = function (obj) {
        if (!_.isObject(obj))
            return [];
        if (nativeKeys)
            return nativeKeys(obj);
        var keys = [];
        for (var key in obj)
            if (has(obj, key))
                keys.push(key);
        // Ahem, IE < 9.
        if (hasEnumBug)
            collectNonEnumProps(obj, keys);
        return keys;
    };
    // Retrieve all the property names of an object.
    _.allKeys = function (obj) {
        if (!_.isObject(obj))
            return [];
        var keys = [];
        for (var key in obj)
            keys.push(key);
        // Ahem, IE < 9.
        if (hasEnumBug)
            collectNonEnumProps(obj, keys);
        return keys;
    };
    // Retrieve the values of an object's properties.
    _.values = function (obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var values = Array(length);
        for (var i = 0; i < length; i++) {
            values[i] = obj[keys[i]];
        }
        return values;
    };
    // Returns the results of applying the iteratee to each element of the object.
    // In contrast to _.map it returns an object.
    _.mapObject = function (obj, iteratee, context) {
        iteratee = cb(iteratee, context);
        var keys = _.keys(obj), length = keys.length, results = {};
        for (var index = 0; index < length; index++) {
            var currentKey = keys[index];
            results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
        }
        return results;
    };
    // Convert an object into a list of `[key, value]` pairs.
    // The opposite of _.object.
    _.pairs = function (obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var pairs = Array(length);
        for (var i = 0; i < length; i++) {
            pairs[i] = [keys[i], obj[keys[i]]];
        }
        return pairs;
    };
    // Invert the keys and values of an object. The values must be serializable.
    _.invert = function (obj) {
        var result = {};
        var keys = _.keys(obj);
        for (var i = 0, length = keys.length; i < length; i++) {
            result[obj[keys[i]]] = keys[i];
        }
        return result;
    };
    // Return a sorted list of the function names available on the object.
    // Aliased as `methods`.
    _.functions = _.methods = function (obj) {
        var names = [];
        for (var key in obj) {
            if (_.isFunction(obj[key]))
                names.push(key);
        }
        return names.sort();
    };
    // An internal function for creating assigner functions.
    var createAssigner = function (keysFunc, defaults) {
        return function (obj) {
            var length = arguments.length;
            if (defaults)
                obj = Object(obj);
            if (length < 2 || obj == null)
                return obj;
            for (var index = 1; index < length; index++) {
                var source = arguments[index], keys = keysFunc(source), l = keys.length;
                for (var i = 0; i < l; i++) {
                    var key = keys[i];
                    if (!defaults || obj[key] === void 0)
                        obj[key] = source[key];
                }
            }
            return obj;
        };
    };
    // Extend a given object with all the properties in passed-in object(s).
    _.extend = createAssigner(_.allKeys);
    // Assigns a given object with all the own properties in the passed-in object(s).
    // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
    _.extendOwn = _.assign = createAssigner(_.keys);
    // Returns the first key on an object that passes a predicate test.
    _.findKey = function (obj, predicate, context) {
        predicate = cb(predicate, context);
        var keys = _.keys(obj), key;
        for (var i = 0, length = keys.length; i < length; i++) {
            key = keys[i];
            if (predicate(obj[key], key, obj))
                return key;
        }
    };
    // Internal pick helper function to determine if `obj` has key `key`.
    var keyInObj = function (value, key, obj) {
        return key in obj;
    };
    // Return a copy of the object only containing the whitelisted properties.
    _.pick = restArguments(function (obj, keys) {
        var result = {}, iteratee = keys[0];
        if (obj == null)
            return result;
        if (_.isFunction(iteratee)) {
            if (keys.length > 1)
                iteratee = optimizeCb(iteratee, keys[1]);
            keys = _.allKeys(obj);
        }
        else {
            iteratee = keyInObj;
            keys = flatten(keys, false, false);
            obj = Object(obj);
        }
        for (var i = 0, length = keys.length; i < length; i++) {
            var key = keys[i];
            var value = obj[key];
            if (iteratee(value, key, obj))
                result[key] = value;
        }
        return result;
    });
    // Return a copy of the object without the blacklisted properties.
    _.omit = restArguments(function (obj, keys) {
        var iteratee = keys[0], context;
        if (_.isFunction(iteratee)) {
            iteratee = _.negate(iteratee);
            if (keys.length > 1)
                context = keys[1];
        }
        else {
            keys = _.map(flatten(keys, false, false), String);
            iteratee = function (value, key) {
                return !_.contains(keys, key);
            };
        }
        return _.pick(obj, iteratee, context);
    });
    // Fill in a given object with default properties.
    _.defaults = createAssigner(_.allKeys, true);
    // Creates an object that inherits from the given prototype object.
    // If additional properties are provided then they will be added to the
    // created object.
    _.create = function (prototype, props) {
        var result = baseCreate(prototype);
        if (props)
            _.extendOwn(result, props);
        return result;
    };
    // Create a (shallow-cloned) duplicate of an object.
    _.clone = function (obj) {
        if (!_.isObject(obj))
            return obj;
        return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
    };
    // Invokes interceptor with the obj, and then returns obj.
    // The primary purpose of this method is to "tap into" a method chain, in
    // order to perform operations on intermediate results within the chain.
    _.tap = function (obj, interceptor) {
        interceptor(obj);
        return obj;
    };
    // Returns whether an object has a given set of `key:value` pairs.
    _.isMatch = function (object, attrs) {
        var keys = _.keys(attrs), length = keys.length;
        if (object == null)
            return !length;
        var obj = Object(object);
        for (var i = 0; i < length; i++) {
            var key = keys[i];
            if (attrs[key] !== obj[key] || !(key in obj))
                return false;
        }
        return true;
    };
    // Internal recursive comparison function for `isEqual`.
    var eq, deepEq;
    eq = function (a, b, aStack, bStack) {
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
        if (a === b)
            return a !== 0 || 1 / a === 1 / b;
        // `null` or `undefined` only equal to itself (strict comparison).
        if (a == null || b == null)
            return false;
        // `NaN`s are equivalent, but non-reflexive.
        if (a !== a)
            return b !== b;
        // Exhaust primitive checks
        var type = typeof a;
        if (type !== 'function' && type !== 'object' && typeof b != 'object')
            return false;
        return deepEq(a, b, aStack, bStack);
    };
    // Internal recursive comparison function for `isEqual`.
    deepEq = function (a, b, aStack, bStack) {
        // Unwrap any wrapped objects.
        if (a instanceof _)
            a = a._wrapped;
        if (b instanceof _)
            b = b._wrapped;
        // Compare `[[Class]]` names.
        var className = toString.call(a);
        if (className !== toString.call(b))
            return false;
        switch (className) {
            // Strings, numbers, regular expressions, dates, and booleans are compared by value.
            case '[object RegExp]':
            // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
            case '[object String]':
                // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
                // equivalent to `new String("5")`.
                return '' + a === '' + b;
            case '[object Number]':
                // `NaN`s are equivalent, but non-reflexive.
                // Object(NaN) is equivalent to NaN.
                if (+a !== +a)
                    return +b !== +b;
                // An `egal` comparison is performed for other numeric values.
                return +a === 0 ? 1 / +a === 1 / b : +a === +b;
            case '[object Date]':
            case '[object Boolean]':
                // Coerce dates and booleans to numeric primitive values. Dates are compared by their
                // millisecond representations. Note that invalid dates with millisecond representations
                // of `NaN` are not equivalent.
                return +a === +b;
            case '[object Symbol]':
                return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
        }
        var areArrays = className === '[object Array]';
        if (!areArrays) {
            if (typeof a != 'object' || typeof b != 'object')
                return false;
            // Objects with different constructors are not equivalent, but `Object`s or `Array`s
            // from different frames are.
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                _.isFunction(bCtor) && bCtor instanceof bCtor)
                && ('constructor' in a && 'constructor' in b)) {
                return false;
            }
        }
        // Assume equality for cyclic structures. The algorithm for detecting cyclic
        // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
        // Initializing stack of traversed objects.
        // It's done here since we only need them for objects and arrays comparison.
        aStack = aStack || [];
        bStack = bStack || [];
        var length = aStack.length;
        while (length--) {
            // Linear search. Performance is inversely proportional to the number of
            // unique nested structures.
            if (aStack[length] === a)
                return bStack[length] === b;
        }
        // Add the first object to the stack of traversed objects.
        aStack.push(a);
        bStack.push(b);
        // Recursively compare objects and arrays.
        if (areArrays) {
            // Compare array lengths to determine if a deep comparison is necessary.
            length = a.length;
            if (length !== b.length)
                return false;
            // Deep compare the contents, ignoring non-numeric properties.
            while (length--) {
                if (!eq(a[length], b[length], aStack, bStack))
                    return false;
            }
        }
        else {
            // Deep compare objects.
            var keys = _.keys(a), key;
            length = keys.length;
            // Ensure that both objects contain the same number of properties before comparing deep equality.
            if (_.keys(b).length !== length)
                return false;
            while (length--) {
                // Deep compare each member
                key = keys[length];
                if (!(has(b, key) && eq(a[key], b[key], aStack, bStack)))
                    return false;
            }
        }
        // Remove the first object from the stack of traversed objects.
        aStack.pop();
        bStack.pop();
        return true;
    };
    // Perform a deep comparison to check if two objects are equal.
    _.isEqual = function (a, b) {
        return eq(a, b);
    };
    // Is a given array, string, or object empty?
    // An "empty" object has no enumerable own-properties.
    _.isEmpty = function (obj) {
        if (obj == null)
            return true;
        if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)))
            return obj.length === 0;
        return _.keys(obj).length === 0;
    };
    // Is a given value a DOM element?
    _.isElement = function (obj) {
        return !!(obj && obj.nodeType === 1);
    };
    // Is a given value an array?
    // Delegates to ECMA5's native Array.isArray
    _.isArray = nativeIsArray || function (obj) {
        return toString.call(obj) === '[object Array]';
    };
    // Is a given variable an object?
    _.isObject = function (obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };
    // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError, isMap, isWeakMap, isSet, isWeakSet.
    _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error', 'Symbol', 'Map', 'WeakMap', 'Set', 'WeakSet'], function (name) {
        _['is' + name] = function (obj) {
            return toString.call(obj) === '[object ' + name + ']';
        };
    });
    // Define a fallback version of the method in browsers (ahem, IE < 9), where
    // there isn't any inspectable "Arguments" type.
    if (!_.isArguments(arguments)) {
        _.isArguments = function (obj) {
            return has(obj, 'callee');
        };
    }
    // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
    // IE 11 (#1621), Safari 8 (#1929), and PhantomJS (#2236).
    var nodelist = root.document && root.document.childNodes;
    if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
        _.isFunction = function (obj) {
            return typeof obj == 'function' || false;
        };
    }
    // Is a given object a finite number?
    _.isFinite = function (obj) {
        return !_.isSymbol(obj) && isFinite(obj) && !isNaN(parseFloat(obj));
    };
    // Is the given value `NaN`?
    _.isNaN = function (obj) {
        return _.isNumber(obj) && isNaN(obj);
    };
    // Is a given value a boolean?
    _.isBoolean = function (obj) {
        return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
    };
    // Is a given value equal to null?
    _.isNull = function (obj) {
        return obj === null;
    };
    // Is a given variable undefined?
    _.isUndefined = function (obj) {
        return obj === void 0;
    };
    // Shortcut function for checking if an object has a given property directly
    // on itself (in other words, not on a prototype).
    _.has = function (obj, path) {
        if (!_.isArray(path)) {
            return has(obj, path);
        }
        var length = path.length;
        for (var i = 0; i < length; i++) {
            var key = path[i];
            if (obj == null || !hasOwnProperty.call(obj, key)) {
                return false;
            }
            obj = obj[key];
        }
        return !!length;
    };
    // Utility Functions
    // -----------------
    // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
    // previous owner. Returns a reference to the Underscore object.
    _.noConflict = function () {
        root._ = previousUnderscore;
        return this;
    };
    // Keep the identity function around for default iteratees.
    _.identity = function (value) {
        return value;
    };
    // Predicate-generating functions. Often useful outside of Underscore.
    _.constant = function (value) {
        return function () {
            return value;
        };
    };
    _.noop = function () { };
    // Creates a function that, when passed an object, will traverse that object’s
    // properties down the given `path`, specified as an array of keys or indexes.
    _.property = function (path) {
        if (!_.isArray(path)) {
            return shallowProperty(path);
        }
        return function (obj) {
            return deepGet(obj, path);
        };
    };
    // Generates a function for a given object that returns a given property.
    _.propertyOf = function (obj) {
        if (obj == null) {
            return function () { };
        }
        return function (path) {
            return !_.isArray(path) ? obj[path] : deepGet(obj, path);
        };
    };
    // Returns a predicate for checking whether an object has a given set of
    // `key:value` pairs.
    _.matcher = _.matches = function (attrs) {
        attrs = _.extendOwn({}, attrs);
        return function (obj) {
            return _.isMatch(obj, attrs);
        };
    };
    // Run a function **n** times.
    _.times = function (n, iteratee, context) {
        var accum = Array(Math.max(0, n));
        iteratee = optimizeCb(iteratee, context, 1);
        for (var i = 0; i < n; i++)
            accum[i] = iteratee(i);
        return accum;
    };
    // Return a random integer between min and max (inclusive).
    _.random = function (min, max) {
        if (max == null) {
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    };
    // A (possibly faster) way to get the current timestamp as an integer.
    _.now = Date.now || function () {
        return new Date().getTime();
    };
    // List of HTML entities for escaping.
    var escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;'
    };
    var unescapeMap = _.invert(escapeMap);
    // Functions for escaping and unescaping strings to/from HTML interpolation.
    var createEscaper = function (map) {
        var escaper = function (match) {
            return map[match];
        };
        // Regexes for identifying a key that needs to be escaped.
        var source = '(?:' + _.keys(map).join('|') + ')';
        var testRegexp = RegExp(source);
        var replaceRegexp = RegExp(source, 'g');
        return function (string) {
            string = string == null ? '' : '' + string;
            return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
        };
    };
    _.escape = createEscaper(escapeMap);
    _.unescape = createEscaper(unescapeMap);
    // Traverses the children of `obj` along `path`. If a child is a function, it
    // is invoked with its parent as context. Returns the value of the final
    // child, or `fallback` if any child is undefined.
    _.result = function (obj, path, fallback) {
        if (!_.isArray(path))
            path = [path];
        var length = path.length;
        if (!length) {
            return _.isFunction(fallback) ? fallback.call(obj) : fallback;
        }
        for (var i = 0; i < length; i++) {
            var prop = obj == null ? void 0 : obj[path[i]];
            if (prop === void 0) {
                prop = fallback;
                i = length; // Ensure we don't continue iterating.
            }
            obj = _.isFunction(prop) ? prop.call(obj) : prop;
        }
        return obj;
    };
    // Generate a unique integer id (unique within the entire client session).
    // Useful for temporary DOM ids.
    var idCounter = 0;
    _.uniqueId = function (prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
    };
    // By default, Underscore uses ERB-style template delimiters, change the
    // following template settings to use alternative delimiters.
    _.templateSettings = {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
    };
    // When customizing `templateSettings`, if you don't want to define an
    // interpolation, evaluation or escaping regex, we need one that is
    // guaranteed not to match.
    var noMatch = /(.)^/;
    // Certain characters need to be escaped so that they can be put into a
    // string literal.
    var escapes = {
        "'": "'",
        '\\': '\\',
        '\r': 'r',
        '\n': 'n',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    };
    var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;
    var escapeChar = function (match) {
        return '\\' + escapes[match];
    };
    // JavaScript micro-templating, similar to John Resig's implementation.
    // Underscore templating handles arbitrary delimiters, preserves whitespace,
    // and correctly escapes quotes within interpolated code.
    // NB: `oldSettings` only exists for backwards compatibility.
    _.template = function (text, settings, oldSettings) {
        if (!settings && oldSettings)
            settings = oldSettings;
        settings = _.defaults({}, settings, _.templateSettings);
        // Combine delimiters into one regular expression via alternation.
        var matcher = RegExp([
            (settings.escape || noMatch).source,
            (settings.interpolate || noMatch).source,
            (settings.evaluate || noMatch).source
        ].join('|') + '|$', 'g');
        // Compile the template source, escaping string literals appropriately.
        var index = 0;
        var source = "__p+='";
        text.replace(matcher, function (match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
            index = offset + match.length;
            if (escape) {
                source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
            }
            else if (interpolate) {
                source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
            }
            else if (evaluate) {
                source += "';\n" + evaluate + "\n__p+='";
            }
            // Adobe VMs need the match returned to produce the correct offset.
            return match;
        });
        source += "';\n";
        // If a variable is not specified, place data values in local scope.
        if (!settings.variable)
            source = 'with(obj||{}){\n' + source + '}\n';
        source = "var __t,__p='',__j=Array.prototype.join," +
            "print=function(){__p+=__j.call(arguments,'');};\n" +
            source + 'return __p;\n';
        var render;
        try {
            render = new Function(settings.variable || 'obj', '_', source);
        }
        catch (e) {
            e.source = source;
            throw e;
        }
        var template = function (data) {
            return render.call(this, data, _);
        };
        // Provide the compiled source as a convenience for precompilation.
        var argument = settings.variable || 'obj';
        template.source = 'function(' + argument + '){\n' + source + '}';
        return template;
    };
    // Add a "chain" function. Start chaining a wrapped Underscore object.
    _.chain = function (obj) {
        var instance = _(obj);
        instance._chain = true;
        return instance;
    };
    // OOP
    // ---------------
    // If Underscore is called as a function, it returns a wrapped object that
    // can be used OO-style. This wrapper holds altered versions of all the
    // underscore functions. Wrapped objects may be chained.
    // Helper function to continue chaining intermediate results.
    var chainResult = function (instance, obj) {
        return instance._chain ? _(obj).chain() : obj;
    };
    // Add your own custom functions to the Underscore object.
    _.mixin = function (obj) {
        _.each(_.functions(obj), function (name) {
            var func = _[name] = obj[name];
            _.prototype[name] = function () {
                var args = [this._wrapped];
                push.apply(args, arguments);
                return chainResult(this, func.apply(_, args));
            };
        });
        return _;
    };
    // Add all of the Underscore functions to the wrapper object.
    _.mixin(_);
    // Add all mutator Array functions to the wrapper.
    _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function (name) {
        var method = ArrayProto[name];
        _.prototype[name] = function () {
            var obj = this._wrapped;
            method.apply(obj, arguments);
            if ((name === 'shift' || name === 'splice') && obj.length === 0)
                delete obj[0];
            return chainResult(this, obj);
        };
    });
    // Add all accessor Array functions to the wrapper.
    _.each(['concat', 'join', 'slice'], function (name) {
        var method = ArrayProto[name];
        _.prototype[name] = function () {
            return chainResult(this, method.apply(this._wrapped, arguments));
        };
    });
    // Extracts the result from a wrapped and chained object.
    _.prototype.value = function () {
        return this._wrapped;
    };
    // Provide unwrapping proxy for some methods used in engine operations
    // such as arithmetic and JSON stringification.
    _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;
    _.prototype.toString = function () {
        return String(this._wrapped);
    };
    // AMD registration happens at the end for compatibility with AMD loaders
    // that may not enforce next-turn semantics on modules. Even though general
    // practice for AMD registration is to be anonymous, underscore registers
    // as a named module because, like jQuery, it is a base library that is
    // popular enough to be bundled in a third party lib, but not be part of
    // an AMD load request. Those cases could generate an error when an
    // anonymous define() is called outside of a loader request.
    if (typeof define == 'function' && define.amd) {
        define('underscore', [], function () {
            return _;
        });
    }
}());
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            // ALL VIEW 
            visual.TOP_PAD_DATES_ALL_ZOOM = 20;
            // MONTH VIEW
            visual.LEFT_PAD_MONTH_ZOOM = 20;
            visual.TOP_PAD_MONTH_ZOOM = 100;
            visual.DATE_SELECTED_COLOR = '#000000';
            visual.DATE_UNSELECTED_COLOR = '#999';
            visual.Default_Handle_Touch_Delay = 1000;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            /**
             * checks the calendar visual's date data role for a heirarchy date, and return drilldown information if true
             * @function @exports
             * @param {DataView[]} dataViews    -the dataviews associated with the calendar visual
             * @param {Date[]} dateArray        -dates featured int he current view
             * @returns {DrillDownInformaton}   -information specific to drilldown views
             */
            function checkDrillDownRequirements(dataViews, dateArray) {
                var drillDownLabelArray = [];
                var isDrillDown = typeof (dataViews[0].categorical.categories[0].values[0]) != 'object' ? true : false;
                if (isDrillDown) {
                    var categories = dataViews[0].categorical.categories[0];
                    var categoryArray = categories.values;
                    // All arrays should be the same
                    var length_1 = dataViews[0].categorical.values[0].values.length;
                    for (var i = 0; i < length_1; i++) {
                        var buildCategory = [];
                        buildCategory.push(categoryArray[i]);
                        drillDownLabelArray.push(buildCategory.join(" "));
                    }
                }
                var drillDownInfo = {
                    isDrillDown: isDrillDown,
                    allowStandardCalendar: false,
                    dates: dateArray,
                    labels: drillDownLabelArray
                };
                return drillDownInfo;
            }
            visual.checkDrillDownRequirements = checkDrillDownRequirements;
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
            function getDayDataPoints(dates, values, viewModel, options, host) {
                var calendarDataPoints = [];
                // Get Minimum and Maximum Values and dates
                var minValue = d3.min(values, function (d) { return d; });
                var maxValue = d3.max(values, function (d) { return d; });
                var minDateDataPoint = d3.min(dates, function (d) { return d; });
                viewModel.minimumDate = new Date(minDateDataPoint.getFullYear(), minDateDataPoint.getMonth(), 1);
                var maxDateDataPoint = d3.max(dates, function (d) { return d; });
                viewModel.maximumDate = new Date(maxDateDataPoint.getFullYear(), maxDateDataPoint.getMonth() + 1, 0);
                var maxRangeDate = new Date(maxDateDataPoint.getFullYear(), maxDateDataPoint.getMonth() + 1, 1);
                var timeSpan = d3.time.day.range(viewModel.minimumDate, maxRangeDate);
                var difference = differenceOfArrays(dates, timeSpan);
                // setup colors for each date depending on configurations
                var color = getColorFromValues(minValue, maxValue, viewModel.configurations);
                // Set Data Points from Power BI
                for (var i = 0; i < dates.length; i++) {
                    var selectionId = host.createSelectionIdBuilder()
                        .withCategory(options.dataViews[0].categorical.categories[0], i)
                        .createSelectionId();
                    var dataPoint = {
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
                for (var i = 0; i < difference.length; i++) {
                    var differenceDate = new Date(difference[i].toString());
                    var dataPoint = {
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
            visual.getDayDataPoints = getDayDataPoints;
            /**
             * gets drill down data points from the data view for the current view
             * @function @exports
             * @param {CalendarViewModel} viewModel -view model representing the calendar visual
             * @param {VisualUpdateOptions} options -Contains references to the size of the container and the dataView which contains
             *                                      all the data the visual had queried
             * @param {IVisualHost} host            -contains services for calendar visual
             * @returns {DateDataPoint[]}            -data points for all dates in current view
             */
            function getDrillDownDataPoints(viewModel, options, host) {
                var categories = options.dataViews[0].categorical.categories[0].values;
                var values = options.dataViews[0].categorical.values[0].values;
                var drillDownType = options.dataViews[0].categorical.categories[0].source.displayName;
                // Get Minimum and Maximum Values and dates
                var minValue = d3.min(values, function (d) { return d; });
                var maxValue = d3.max(values, function (d) { return d; });
                var color = getColorFromValues(minValue, maxValue, viewModel.configurations);
                // Create Data Points
                var dataPoints = [];
                for (var i = 0; i < categories.length; i++) {
                    var selectionId = host.createSelectionIdBuilder()
                        .withCategory(options.dataViews[0].categorical.categories[0], i)
                        .createSelectionId();
                    var category = categories[i].toString();
                    var value = values[i];
                    var label = viewModel.drillDownInfo.labels[i];
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
            visual.getDrillDownDataPoints = getDrillDownDataPoints;
            /**
             * gets day configuration array based on week start day
             * @function @exports
             * @param weekStartDay  -day number week starts on
             */
            function getDayConfigurationArray(weekStartDay) {
                var dayArray = [[0, 'Su'], [1, 'Mo'], [2, 'Tu'], [3, 'We'], [4, 'Th'], [5, 'Fr'], [6, 'Sa']];
                var rightArray = dayArray;
                var leftArray = dayArray.splice(weekStartDay);
                var configuredArray = leftArray.concat(rightArray);
                var configuredDayIndexArray = [];
                for (var i = 0; i <= 6; i++) {
                    var dayConfig = { actualDayIndex: Number(configuredArray[i][0]), configuredDayIndex: i, dayLabel: String(configuredArray[i][1]) };
                    configuredDayIndexArray.push(dayConfig);
                }
                return configuredDayIndexArray;
            }
            visual.getDayConfigurationArray = getDayConfigurationArray;
            /**
             * returns the difference of two arrays
             * @function @exports
             * @param {any[]} test1     -array
             * @param {any[]} test2     -array
             * @returns {any[]}         -difference of the two arrays
             */
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
            visual.differenceOfArrays = differenceOfArrays;
            /**
             * gets number of columns in calendar from the number of rows and number of months in calendar
             * @function @exports
             * @param {number} numberOfRows     -number of rows in calendar
             * @param {number} numberOfMonths   -number of months in cleandar
             * @returns {number}                -number of columns in calendar
             */
            function getNumberOfColumnsByRow(numberOfRows, numberOfMonths) {
                var numberOfColumns = 0;
                var monthsOverRows = numberOfMonths / numberOfRows;
                // See if it was an even divide
                if (monthsOverRows - Math.floor(monthsOverRows) == 0) {
                    numberOfColumns = monthsOverRows;
                }
                else {
                    numberOfColumns = Math.ceil(monthsOverRows);
                }
                return numberOfColumns;
            }
            visual.getNumberOfColumnsByRow = getNumberOfColumnsByRow;
            /**
             * gets number of rows in calendar from number of columns and number of months in calendar
             * @function @exports
             * @param {number} numberOfColumns  -number of columns in calendar
             * @param {number} numberOfMonths   -number of months in calendar
             * @returns {number}                number of rows in calendar
             */
            function getNumberOfRowsByColumn(numberOfColumns, numberOfMonths) {
                var numberOfRows = 0;
                var monthsOverColumns = numberOfMonths / numberOfColumns;
                // See if it was an even divide
                if (monthsOverColumns - Math.floor(monthsOverColumns) == 0) {
                    numberOfRows = monthsOverColumns;
                }
                else {
                    numberOfRows = Math.ceil(monthsOverColumns);
                }
                return numberOfRows;
            }
            visual.getNumberOfRowsByColumn = getNumberOfRowsByColumn;
            /**
             * gets color from values and calendar configuration
             * @function @exports
             * @param {number} min                              -min color value
             * @param {number} max                              -max color value
             * @param {CalendarConfiguration} configurations    -current configurations for calendar visual
             * @returns {d3.scale.Linear<string, string>}       color value
             */
            function getColorFromValues(min, max, configurations) {
                var color = d3.scale.linear();
                // setup colors for each date depending on configurations
                if (configurations.diverging.diverging) {
                    // Get Diverging Values
                    var centerDivergingValue = configurations.diverging.centerValue;
                    var minDivergingValue = configurations.diverging.minValue;
                    var maxDivergingValue = configurations.diverging.maxValue;
                    var divergingColor = d3.scale.linear();
                    color.domain([minDivergingValue, centerDivergingValue, maxDivergingValue])
                        .range([configurations.diverging.minColor.solid.color, configurations.diverging.centerColor.solid.color, configurations.diverging.maxColor.solid.color]);
                }
                else {
                    color.domain([min, max]).range([visual.Color[visual.Color.WHITE], configurations.dataPoint.solid.color]);
                }
                return color;
            }
            visual.getColorFromValues = getColorFromValues;
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
            function getColumnNumber(monthIndex, numberOfMonths, numberOfColumns, numberOfRows, scrollDirection) {
                // Month Index is base '1'
                if (scrollDirection == 0 /*Vertical - input columns*/) {
                    var modulusCheck = monthIndex % numberOfColumns;
                    if (modulusCheck == 0) {
                        return numberOfColumns;
                    }
                    else {
                        return modulusCheck;
                    }
                }
                else {
                    var fullRows = numberOfMonths % numberOfRows != 0 ? numberOfMonths % numberOfRows : numberOfRows;
                    if (monthIndex > (fullRows * numberOfColumns)) {
                        numberOfColumns = numberOfColumns - 1;
                        monthIndex = monthIndex - 1;
                    }
                    var modulusCheck = monthIndex % numberOfColumns;
                    if (modulusCheck == 0) {
                        return numberOfColumns;
                    }
                    else {
                        return modulusCheck;
                    }
                }
            }
            visual.getColumnNumber = getColumnNumber;
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
            function getRowNumber(monthIndex, numberOfMonths, numberOfColumns, numberOfRows, scrollDirection) {
                if (scrollDirection == 0) {
                    return Math.ceil(monthIndex / numberOfColumns);
                }
                else {
                    var fullRows = numberOfMonths % numberOfRows != 0 ? numberOfMonths % numberOfRows : numberOfRows;
                    if (monthIndex > (fullRows * numberOfColumns)) {
                        numberOfColumns = numberOfColumns - 1;
                        monthIndex = monthIndex - 1;
                    }
                    return Math.ceil(monthIndex / numberOfColumns);
                }
            }
            visual.getRowNumber = getRowNumber;
            /**
             * returns an abbreviated label for a full month name
             * @function @exports
             * @param {string} category -name of month
             * @returns {string}        abbreviated month name
             */
            function formatMonthCategory(category) {
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
            visual.formatMonthCategory = formatMonthCategory;
            /**
             * event callback for link/view navigation styling. adds styling on hover
             * @function @exports
             * @param {string} color        -desired color of link on hover
             * @param {Element} textElem    -element to add styling to
             */
            function addMonthHoverStyling(color, textElem) {
                textElem = textElem && textElem instanceof Element ? textElem : this;
                textElem.setAttribute('stroke', color);
                textElem.setAttribute('fill', color);
            }
            visual.addMonthHoverStyling = addMonthHoverStyling;
            /**
             * Event callback for link/view navigation styling. removes styling on leaving element
             * @function @exports
             * @param {Element} textElem    -element to remove styling from
             */
            function removeMonthHoverStyling(textElem) {
                textElem = textElem && textElem instanceof Element ? textElem : this;
                textElem.removeAttribute('stroke');
                textElem.setAttribute("fill", visual.Color[visual.Color.GREY]);
            }
            visual.removeMonthHoverStyling = removeMonthHoverStyling;
            /**
             * gets tooltip data for a given data point
             * @function @exports
             * @param {CalendarDataPoint} value     -data point
             * @returns {VisualTooltipDataItem[]}   tool tiptip data
             */
            function getTooltipData(value) {
                return [{
                        displayName: d3.time.format('%Y-%m-%d')(value.date),
                        value: value.value.toString()
                    }];
            }
            visual.getTooltipData = getTooltipData;
            /**
             * gets tooltip for drilldown data point
             * @function @exports
             * @param {DateDatePoint} value         -data point
             * @returns {VisualTooltipDataItem[]}   tooltip data
             */
            function getDrillDownTooltipData(value) {
                return [{
                        displayName: value.label,
                        value: value.value.toString()
                    }];
            }
            visual.getDrillDownTooltipData = getDrillDownTooltipData;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            /**
             * Gets property value for a particular object.
             *
             * @function
             * @param {DataViewObjects} objects - Map of defined objects.
             * @param {string} objectName       - Name of desired object.
             * @param {string} propertyName     - Name of desired property.
             * @param {T} defaultValue          - Default value of desired property.
             */
            function getValue(objects, objectName, propertyName, defaultValue) {
                if (objects) {
                    var object = objects[objectName];
                    if (object) {
                        var property = object[propertyName];
                        if (property !== undefined) {
                            return property;
                        }
                    }
                }
                return defaultValue;
            }
            visual.getValue = getValue;
            /**
             * Gets property value for a particular object in a category.
             *
             * @function
             * @param {DataViewCategoryColumn} category - List of category objects.
             * @param {number} index                    - Index of category object.
             * @param {string} objectName               - Name of desired object.
             * @param {string} propertyName             - Name of desired property.
             * @param {T} defaultValue                  - Default value of desired property.
             */
            function getCategoricalObjectValue(category, index, objectName, propertyName, defaultValue) {
                var categoryObjects = category.objects;
                if (categoryObjects) {
                    var categoryObject = categoryObjects[index];
                    if (categoryObject) {
                        var object = categoryObject[objectName];
                        if (object) {
                            var property = object[propertyName];
                            if (property !== undefined) {
                                return property;
                            }
                        }
                    }
                }
                return defaultValue;
            }
            visual.getCategoricalObjectValue = getCategoricalObjectValue;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            /**
             * manages date selections and zoom views
             * @class
            */
            var StateManager = (function () {
                /**
                 * creates a new statemanager with selection manager and default values for anchor and zoom level
                 * @constructor
                 * @param {ISelectionManager} selectionManager -selection manager
                 */
                function StateManager(selectionManager) {
                    this.selectionManager = selectionManager;
                    this.setAnchor(null);
                    this.setAllZoom();
                }
                /**
                 * Adds the SelectionIds for the current month/year to the selection manager
                 * @method
                 * @param {CalendarViewModel} viewModel -the calendar view model
                 * @param {Month} selectedMonth         -selected month
                 * @param {Year} selectedYear           -selected year
                 */
                StateManager.prototype.selectMonth = function (viewModel, selectedMonth, selectedYear) {
                    var monthDataPoints = _.filter(viewModel.dataPoints, function (dataPoint) { return dataPoint.month == selectedMonth && dataPoint.year == selectedYear; });
                    var selectedIds = [];
                    _.each(monthDataPoints, function (dp) {
                        if (dp.selectionId != null) {
                            selectedIds.push(dp.selectionId);
                        }
                    });
                    this.selectionManager.select(selectedIds);
                };
                /**
                 * Adds the SelectionIds for the selected year to the selection manager
                 * @method
                 * @param {CalendarDataPoint[]} dataPoints  -data points for the calendar visual
                 * @param {number} selectedYear             -selected year
                 */
                StateManager.prototype.selectYear = function (dataPoints, selectedYear) {
                    var yearPoints = _.filter(dataPoints, function (dataPoint) { return dataPoint.year == selectedYear; });
                    var selectedIds = [];
                    _.each(yearPoints, function (dp) {
                        if (dp.selectionId != null) {
                            selectedIds.push(dp.selectionId);
                        }
                    });
                    this.selectionManager.select(selectedIds);
                };
                /**
                 * Gets current zoom level from this state manager
                 * @method
                 * @returns {ZoomLevel} -enumerator representing current zoom level
                 */
                StateManager.prototype.getZoomLevel = function () {
                    return this.zoomLevel;
                };
                /**
                 * sets the current zoom level in this state manager
                 * @param {ZoomLevel} zoomLevel -enumerator representing new zoom level}
                 */
                StateManager.prototype.setZoomLevel = function (zoomLevel) {
                    this.zoomLevel = zoomLevel;
                };
                /**
                 * sets the zoom level and selected month and year in this state manager
                 * @method
                 * @param {ZoomLevel} zoomLevel -enumerator representing zoom level
                 * @param {number} monthNumber  -selected month
                 * @param {number} yearNumber   -selected year
                 */
                StateManager.prototype.setMonthZoom = function (zoomLevel, monthNumber, yearNumber) {
                    this.zoomLevel = 1 /* MONTH */;
                    this.selectedMonth = monthNumber;
                    this.selectedYear = yearNumber;
                };
                /**
                 * gets selected month from this state manager
                 * @method
                 * @returns {Month} -selected month
                 */
                StateManager.prototype.getSelectedMonth = function () {
                    return this.selectedMonth;
                };
                /**
                 * gets selected year from this state manager
                 * @method
                 * @returns {number}    -selected year
                 */
                StateManager.prototype.getSelectedYear = function () {
                    return this.selectedYear;
                };
                /**
                 * sets the zoom level to ALL in this state manager
                 * @method
                 */
                StateManager.prototype.setAllZoom = function () {
                    this.zoomLevel = 0 /* ALL */;
                    this.selectedMonth = null;
                    this.selectedYear = null;
                    this.setAnchor(null);
                };
                /**
                 * sets the anchor in this state manager as the given date
                 * @method
                 * @param {Date} anchor    -given date
                 */
                StateManager.prototype.setAnchor = function (anchor) {
                    this.anchorSelection = anchor;
                };
                /**
                 * gets the selected anchor from this state manager
                 * @method
                 * @returns {Date}  -a date which is the selected anchor
                 */
                StateManager.prototype.getAnchor = function () {
                    return this.anchorSelection;
                };
                /**
                 * sets the given date as the date last clicked in this state manager
                 * @method
                 * @param {Date} date   -date to set as last clicked
                 */
                StateManager.prototype.setLastClickedDate = function (date) {
                    this.lastClickedDate = date;
                };
                /**
                 * gets the date last clicked from this state manager
                 * @method
                 * @returns {Date} -the date last clicked
                 */
                StateManager.prototype.getLastClickedDate = function () {
                    return this.lastClickedDate;
                };
                return StateManager;
            }());
            visual.StateManager = StateManager;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            /**Creates views for individual zoom levels and drilldowns */
            var ViewManager = (function () {
                function ViewManager(calendarSVG, calendarContainerGroup, tooltipServiceWrapper, stateManager) {
                    var _this = this;
                    var self = this;
                    this.calendarSVG = calendarSVG;
                    this.calendarContainerGroup = calendarContainerGroup;
                    this.tooltipServiceWrapper = tooltipServiceWrapper;
                    this.stateManager = stateManager;
                    this.selectionManager = stateManager.selectionManager;
                    this.selectionManager.registerOnSelectCallback(function (ids) {
                        var dataPoints = _this.viewModel.drillDownInfo.isDrillDown ? _this.viewModel.drillDownDataPoints : _this.viewModel.dataPoints;
                        var idkeyex = JSON.stringify(ids[0]["dataMap"]) + '[]';
                        var datakeyex = dataPoints[31].selectionId.getKey();
                        console.log(idkeyex);
                        console.log(datakeyex);
                        console.log(idkeyex == datakeyex);
                        debugger;
                        var d = d3.selectAll('.day')
                            .filter(function (data) { return ids.some(function (id) { return data.selectionId.getKey() == JSON.stringify(id["dataMap"]) + '[]'; }); })
                            .classed('selected-rect', true)
                            .attr('stroke', visual.DATE_SELECTED_COLOR)
                            .each(function () {
                            this.parentNode.appendChild(this);
                        });
                        // selects all tiles.... how do we filter to only selected???
                        // d3.selectAll('.day')
                        // .attr({
                        //     'stroke': DATE_SELECTED_COLOR
                        // }).each(function () {
                        //     // Move selection to front
                        //     this.parentNode.appendChild(this);
                        // });
                        _this.stateManager.isBookmark = true;
                        console.log(_this.stateManager.isBookmark);
                    });
                }
                /**
                 * Renders the current calender view
                 * @method
                 * @param {VisualUpdateOptions} options -Contains references to the size of the container and the dataView which contains
                 *                                      all the data the visual had queried
                 * @param {CalendarViewModel} viewModel -view model for the calendar visual
                 * @param selectionManager
                 */
                ViewManager.prototype.renderCalendar = function (options, viewModel) {
                    this.viewModel = viewModel;
                    this.options = options;
                    var currentZoomLevel = this.stateManager.getZoomLevel();
                    this.layoutConfig = new visual.LayoutConfiguration(options, viewModel, currentZoomLevel);
                    if (viewModel.drillDownInfo.isDrillDown) {
                        this.yearViewLayout = new visual.YearViewLayoutConfiguration(options.viewport.width, options.viewport.height, viewModel.configurations, viewModel.drillDownDataPoints.length);
                        this.renderDrillDownView();
                    }
                    else {
                        if (currentZoomLevel === 0 /* ALL */) {
                            this.renderAllZoom();
                        }
                        else if (currentZoomLevel == 1 /* MONTH */) {
                            this.renderMonthZoom(this.stateManager.getSelectedMonth(), this.stateManager.getSelectedYear());
                        }
                    }
                };
                /**
                 * Renders a zoom level "ALL", which displays all months included in the current calendar visual
                 * @method @private
                 */
                ViewManager.prototype.renderAllZoom = function () {
                    if (this.viewModel.dataPoints.length == 0) {
                        return;
                    }
                    // Clear SVG
                    d3.selectAll('.calendarContainer').remove();
                    var svg = this.calendarSVG;
                    this.calendarContainerGroup = svg.append('g').classed('calendarContainer', true);
                    var scrollDirection = this.viewModel.configurations.scrollDirection;
                    var numberOfMonths = this.layoutConfig.numberOfMonths;
                    this.layoutConfig = new visual.LayoutConfiguration(this.options, this.viewModel, 0 /* ALL */);
                    var actualNumberOfColumns = this.layoutConfig.numberOfColumns;
                    var actualNumberOfRows = this.layoutConfig.numberOfRows;
                    // Render Calendar Month
                    var iterateMonth = this.viewModel.minimumDate.getMonth();
                    var iterateYear = this.viewModel.minimumDate.getFullYear();
                    var endMonth = this.viewModel.maximumDate.getMonth();
                    var endYear = this.viewModel.maximumDate.getFullYear();
                    var endLoopMonth = endMonth + 1 != 12 ? endMonth + 1 : 0;
                    var endLoopYear = endLoopMonth != 0 ? endYear : endYear + 1;
                    var monthIndex = 0;
                    var continueMonths = true;
                    // Get Size of SVG
                    this.calendarSVG.attr({
                        width: this.layoutConfig.svgWidth,
                        height: this.layoutConfig.svgHeight
                    });
                    while (continueMonths) {
                        monthIndex = monthIndex + 1;
                        // Get data points for the month
                        var monthDataPoints = this.viewModel.dataPoints.filter(function (obj) {
                            return obj.month === iterateMonth && obj.year == iterateYear;
                        });
                        var columnNumber = visual.getColumnNumber(monthIndex, numberOfMonths, actualNumberOfColumns, actualNumberOfRows, scrollDirection);
                        var rowNumber = visual.getRowNumber(monthIndex, numberOfMonths, actualNumberOfColumns, actualNumberOfRows, scrollDirection);
                        this.renderMonth(monthDataPoints, iterateMonth, iterateYear, monthIndex, columnNumber, rowNumber);
                        iterateMonth = iterateMonth + 1 != 12 ? iterateMonth + 1 : 0;
                        iterateYear = iterateMonth != 0 ? iterateYear : iterateYear + 1;
                        if (iterateMonth == endLoopMonth && iterateYear == endLoopYear) {
                            continueMonths = false;
                        }
                    }
                    this.addSelections(this.viewModel.dataPoints);
                    this.tooltipServiceWrapper.addTooltip(this.calendarContainerGroup.selectAll('.day'), function (tooltipEvent) { return visual.getTooltipData(tooltipEvent.data); }, function (tooltipEvent) { return tooltipEvent.data.selectionId; });
                };
                /**
                 * renders an in individual month for the all zoom view
                 * @method @private
                 * @param {CalendarDataPoint[]} dataPoints  -all datapoints for selected month
                 * @param {number} monthNumber              -number of selected month
                 * @param {number} yearNumber               -number of selected year
                 * @param {number} monthIndex               -index of selected month
                 * @param {number} columnNumber             -column number of month in all view
                 * @param {number} rowNumber                -row number of month in all view
                 */
                ViewManager.prototype.renderMonth = function (dataPoints, monthNumber, yearNumber, monthIndex, columnNumber, rowNumber) {
                    var _this = this;
                    var monthLabel = visual.Month[monthNumber] + ' ' + yearNumber;
                    var selections = this.selectionManager.getSelectionIds();
                    var monthHorizontalOffset = columnNumber == 1 ? this.layoutConfig.horizontalMonthPadding : (this.layoutConfig.calendarDateRectSize * 7 * (columnNumber - 1)) + (this.layoutConfig.horizontalMonthPadding * columnNumber); // Considers size of calendar, and padding between months;
                    var monthVerticalOffset = rowNumber == 1 ? this.layoutConfig.verticalMonthPadding : (this.layoutConfig.calendarDateRectSize * 7 * (rowNumber - 1)) + (20 * rowNumber) + this.layoutConfig.verticalMonthPadding;
                    var self = this;
                    // Render Month Label
                    this.calendarContainerGroup.append('text')
                        .style('text-anchor', 'start')
                        .attr('font-size', this.layoutConfig.calendarDateRectSize)
                        .attr('x', monthHorizontalOffset).attr('y', monthVerticalOffset)
                        .attr('fill', visual.Color[visual.Color.GREY])
                        .text(monthLabel)
                        .on('mouseover', function () { visual.addMonthHoverStyling.call(this, self.viewModel.configurations.dataPoint.solid.color); })
                        .on('mouseout', visual.removeMonthHoverStyling)
                        .on('click', function () {
                        // GO TO MONTH ZOOM
                        self.clearVisualSelections();
                        self.stateManager.setMonthZoom(1 /* MONTH */, monthNumber, yearNumber);
                        self.stateManager.selectMonth(self.viewModel, monthNumber, yearNumber);
                        self.renderMonthZoom(monthNumber, yearNumber);
                    });
                    // Render Day labels            
                    for (var _i = 0, _a = this.viewModel.dayIndexingArray; _i < _a.length; _i++) {
                        var dayLabel = _a[_i];
                        var dayLabelConfig = dayLabel;
                        this.calendarContainerGroup.append('text')
                            .style('text-anchor', 'start')
                            .attr('font-size', self.layoutConfig.calendarDateRectSize * self.layoutConfig.monthTitleRatio)
                            .attr('x', (dayLabelConfig.configuredDayIndex * self.layoutConfig.calendarDateRectSize) + monthHorizontalOffset)
                            .attr('y', monthVerticalOffset + 15)
                            .attr('fill', visual.Color[visual.Color.GREY])
                            .text(dayLabel.dayLabel);
                    }
                    var dayRects = this.calendarContainerGroup.selectAll('.day' + monthIndex).data(dataPoints);
                    dayRects.enter().append('rect')
                        .attr("width", this.layoutConfig.calendarDateRectSize)
                        .attr("height", this.layoutConfig.calendarDateRectSize)
                        .attr("x", function (data) {
                        return _this.setXCoordinateOfDay(data.date, monthHorizontalOffset, 0 /* ALL */, _this.viewModel.dayIndexingArray);
                    })
                        .attr("y", function (data) {
                        return _this.setYCoordinateOfDay(data.date, monthVerticalOffset, 0 /* ALL */, _this.viewModel.configurations.weekStartDay, _this.viewModel.dayIndexingArray);
                    })
                        .attr('fill', function (data) {
                        return data.color;
                    })
                        .attr('stroke', function (data) {
                        return visual.DATE_UNSELECTED_COLOR; // TODO
                    })
                        .attr('class', function (data) {
                        var isSelected = false;
                        if (data.selectionId != null) {
                            for (var i = 0; i < selections.length; i++) {
                                if (selections[i]["key"] == data.selectionId.getKey()) {
                                    isSelected = true;
                                }
                            }
                        }
                        return isSelected ? ' day selected-rect' : 'day';
                    })
                        .attr('stroke-width', "2px");
                    dayRects.exit().remove();
                };
                /**
                 * Renders a zoom level "MONTH", which displays a selected month in the current calendar visual
                 * @method
                 * @param {number} monthNumber          -number representing current month
                 * @param {number} yearNumber           -number representing current year
                 */
                ViewManager.prototype.renderMonthZoom = function (monthNumber, yearNumber) {
                    var _this = this;
                    // Clear SVG
                    d3.selectAll('.calendarContainer').remove();
                    var svg = this.calendarSVG;
                    this.calendarContainerGroup = svg.append('g').classed('calendarContainer', true);
                    this.layoutConfig = new visual.LayoutConfiguration(this.options, this.viewModel, 1 /* MONTH */);
                    // Get Size of SVG
                    this.calendarSVG.attr({
                        width: this.layoutConfig.svgWidth,
                        height: this.layoutConfig.svgHeight
                    });
                    var selectedMonth = visual.Month[monthNumber];
                    var selectedYear = yearNumber;
                    var self = this;
                    // Create Marker definition and path for back button
                    var monthFontSize = this.layoutConfig.calendarDateRectSize / 2;
                    var xAxisStart = 70;
                    var xAxistEnd = 70;
                    var yAxisStart = 60;
                    var yAxisEnd = yAxisStart - monthFontSize;
                    var data = [{ id: 0, name: 'arrow', path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z', linePath: 'M ' + xAxisStart.toString() + ',' + yAxisStart.toString() + ' L ' + xAxistEnd.toString() + ',' + yAxisEnd.toString(), viewbox: '-5 -5 10 10' }];
                    this.calendarContainerGroup.append('rect').classed('allZoomButton', true)
                        .attr('x', 60).attr('y', yAxisEnd - 8)
                        .attr("width", 20)
                        .attr("height", yAxisStart - yAxisEnd + 8)
                        .attr('fill', "white")
                        .on('click', function () {
                        // Zoom out to all
                        _this.clearVisualSelections();
                        self.stateManager.setAllZoom();
                        self.renderAllZoom(); // TODO - KC
                    });
                    var defs = this.calendarContainerGroup.append("svg:defs");
                    var paths = this.calendarContainerGroup.append('svg:g').attr('id', 'markers');
                    var marker = defs.selectAll('marker')
                        .data(data).enter()
                        .append('svg:marker').attr('id', function (d) { return 'marker_' + d.name; })
                        .attr('markerHeight', 5).attr('markerWidth', 5).attr('markerUnits', 'strokeWidth').attr('orient', 'auto')
                        .attr('refX', 0).attr('refY', 0)
                        .attr('viewBox', function (d) { return d.viewbox; })
                        .append('svg:path')
                        .attr('d', function (d) { return d.path; })
                        .attr('fill', visual.Color[visual.Color.GREY]);
                    var path = paths.selectAll('path')
                        .data(data).enter().append('svg:path')
                        .attr('d', function (d) { return d.linePath; })
                        .attr('stroke', visual.Color[visual.Color.GREY])
                        .attr('stroke-width', 3)
                        .attr('stroke-linecap', 'round')
                        .attr('marker-end', function (d, i) { return 'url(#marker_' + d.name + ')'; })
                        .on('click', function () {
                        // Zoom out to all
                        _this.clearVisualSelections();
                        self.stateManager.setAllZoom();
                        self.renderAllZoom();
                    });
                    // Month and Year Label
                    this.calendarContainerGroup.append('text')
                        .style('text-anchor', 'start')
                        .attr('font-size', this.layoutConfig.calendarDateRectSize * this.layoutConfig.monthTitleRatio)
                        .attr('x', visual.LEFT_PAD_MONTH_ZOOM + 70).attr('y', visual.TOP_PAD_MONTH_ZOOM - 40)
                        .attr('fill', visual.Color[visual.Color.GREY])
                        .text(selectedMonth + " " + selectedYear);
                    // Render Day labels            
                    for (var _i = 0, _a = this.viewModel.dayIndexingArray; _i < _a.length; _i++) {
                        var dayLabel = _a[_i];
                        var dayLabelConfig = dayLabel;
                        this.calendarContainerGroup.append('text')
                            .style('text-anchor', 'start')
                            .attr('font-size', this.layoutConfig.calendarDateRectSize * this.layoutConfig.monthTitleRatio)
                            .attr('x', (dayLabelConfig.configuredDayIndex * this.layoutConfig.calendarDateRectSize) + 50).attr('y', 100)
                            .attr('fill', visual.Color[visual.Color.GREY])
                            .text(dayLabel.dayLabel);
                    }
                    var monthDataPoints = _.filter(this.viewModel.dataPoints, function (dataPoint) { return dataPoint.month == monthNumber && dataPoint.year == yearNumber; });
                    var dayRects = this.calendarContainerGroup.selectAll('.day').data(monthDataPoints);
                    dayRects.enter().append('rect').classed('day', true)
                        .attr("width", this.layoutConfig.calendarDateRectSize)
                        .attr("height", this.layoutConfig.calendarDateRectSize)
                        .attr("x", function (data) { return _this.setXCoordinateOfDay(data.date, 50, 0 /* ALL */, _this.viewModel.dayIndexingArray); })
                        .attr("y", function (data) { return _this.setYCoordinateOfDay(data.date, 100, 0 /* ALL */, _this.viewModel.configurations.weekStartDay, _this.viewModel.dayIndexingArray); })
                        .attr('fill', function (data) { return data.color; })
                        .attr('stroke', function (data) { return visual.DATE_UNSELECTED_COLOR; }) //TODO
                        .attr('stroke-width', "2px");
                    dayRects.exit().remove();
                    // Show dates for start of week
                    // date box
                    var datesOfMonth = [];
                    for (var _b = 0, monthDataPoints_1 = monthDataPoints; _b < monthDataPoints_1.length; _b++) {
                        var dp = monthDataPoints_1[_b];
                        datesOfMonth.push(dp.date);
                    }
                    this.calendarContainerGroup.selectAll('.dayNumberBox')
                        .data(datesOfMonth.filter(function (date) { return date.getDay() === self.viewModel.configurations.weekStartDay; }))
                        .enter().append('rect').classed("dayNumberBox", true)
                        .attr('width', 18)
                        .attr('height', 18)
                        .attr('x', function (date) {
                        var rectX = _this.setXCoordinateOfDay(date, 50, 1 /* MONTH */, self.viewModel.dayIndexingArray);
                        return rectX - 13;
                    })
                        .attr('y', function (date) {
                        var rectY = _this.setYCoordinateOfDay(date, 100, 1 /* MONTH */, self.viewModel.configurations.weekStartDay, self.viewModel.dayIndexingArray);
                        ;
                        return rectY - 15;
                    })
                        .attr('fill', function (date) { return visual.Color[visual.Color.WHITE]; })
                        .attr('stroke', function (date) { return visual.DATE_UNSELECTED_COLOR; })
                        .attr('stroke-width', "2px");
                    // Date Number
                    var dayNumberText = this.calendarContainerGroup.selectAll('.dayNumber')
                        .data(datesOfMonth.filter(function (date) { return date.getDay() === self.viewModel.configurations.weekStartDay; }));
                    dayNumberText.enter().append('text').classed('dayNumber', true)
                        .style('text-anchor', 'end')
                        .attr('font-size', 12)
                        .attr('fill', visual.Color[visual.Color.GREY])
                        .attr('x', function (date) {
                        var rectX = _this.setXCoordinateOfDay(date, 50, 1 /* MONTH */, self.viewModel.dayIndexingArray);
                        return rectX + 3;
                    })
                        .attr('y', function (date) {
                        var rectY = _this.setYCoordinateOfDay(date, 100, 1 /* MONTH */, self.viewModel.configurations.weekStartDay, self.viewModel.dayIndexingArray);
                        ;
                        return rectY;
                    })
                        .text(function (date) { return date.getDate(); });
                    this.addSelections(monthDataPoints);
                    this.tooltipServiceWrapper.addTooltip(this.calendarContainerGroup.selectAll('.day'), function (tooltipEvent) { return visual.getTooltipData(tooltipEvent.data); }, function (tooltipEvent) { return tooltipEvent.data.selectionId; });
                };
                /**
                 * Add selection capabilities to datapoints
                 * @method @private
                 * @param {CalendarDataPoint[]} dataPoints  -datapoints to add selections to
                 */
                ViewManager.prototype.addSelections = function (dataPoints) {
                    // Add Selections
                    var self = this;
                    var selectedIds = [];
                    var singleSelect = false;
                    var dayRects = this.calendarContainerGroup.selectAll('.day');
                    // dayRects.on('touchstart', function (d: CalendarDataPoint) {
                    //     let touchevent = d3.event as TouchEvent;
                    //     touchevent.preventDefault();
                    //     if (touchevent.touches.length == 1 && touchevent.targetTouches.length > 0) {
                    //         selectedIds.push(d.selectionId);
                    //     }
                    // });
                    // dayRects.on('touchmove', function (d: CalendarDataPoint) {
                    //     selectedIds.push(d.selectionId);
                    // });
                    // dayRects.on('touchend', function (d: CalendarDataPoint) {
                    //     debugger;
                    //     self.selectionManager.select(selectedIds).then((ids: ISelectionId[]) => {
                    //         d3.selectAll('.day').filter(function (d: CalendarDataPoint) {
                    //             return ids.some(id => id["key"] == d.selectionId.getKey())
                    //         })
                    //             .classed('selected-rect', true).attr({
                    //                 'stroke': DATE_SELECTED_COLOR
                    //             })
                    //             .each(function () {
                    //                 // Move selection to front
                    //                 this.parentNode.appendChild(this);
                    //             });
                    //         // Unselect all days
                    //         d3.selectAll('.day').attr({ 'stroke': DATE_UNSELECTED_COLOR })
                    //         // Select all rects with selected-rect class
                    //         d3.selectAll('.selected-rect').attr({ 'stroke': DATE_SELECTED_COLOR })
                    //             .each(function () {
                    //                 // Move selection to front
                    //                 this.parentNode.appendChild(this);
                    //             });
                    //     });
                    //     // Month Zoom Specific
                    //     if (ZoomLevel.MONTH == self.stateManager.getZoomLevel()) {
                    //         // Insure Day Numbers are rendered first
                    //         self.calendarContainerGroup.selectAll('.dayNumberBox')
                    //             .each(function () {
                    //                 // Move selection to front
                    //                 this.parentNode.appendChild(this);
                    //             });
                    //         self.calendarContainerGroup.selectAll('.dayNumber')
                    //             .each(function () {
                    //                 // Move selection to front
                    //                 this.parentNode.appendChild(this);
                    //             });
                    //         let selectedRectsInMonth = d3.selectAll('.selected-rect');
                    //         if (selectedRectsInMonth[0].length == 0) {
                    //             self.stateManager.selectMonth(self.viewModel, self.stateManager.getSelectedMonth(), self.stateManager.getSelectedYear());
                    //         }
                    //     }
                    // });
                    dayRects.on('click', function (d) {
                        var _this = this;
                        var wasMultiSelect = d3.selectAll('.selected-rect').size() > 1;
                        var minShift = d.date;
                        var maxShift = d.date;
                        var currentClickDate = d.date;
                        if (d.selectionId != null) {
                            var mouseEvent_1 = d3.event;
                            // For 'Ctrl' press - Add new existing selections, but remove if prexisted
                            if (mouseEvent_1.ctrlKey && !mouseEvent_1.shiftKey) {
                                singleSelect = false;
                                var isSelected = d3.select(this).attr("stroke") == visual.DATE_UNSELECTED_COLOR.toString() ? false : true;
                                if (isSelected) {
                                    selectedIds = _.filter(selectedIds, function (sid) { return sid != d.selectionId; });
                                }
                                else {
                                    selectedIds.push(d.selectionId);
                                }
                                self.stateManager.setAnchor(d.date);
                            }
                            else if (!mouseEvent_1.ctrlKey && mouseEvent_1.shiftKey) {
                                // For 'Shift, get range of dates
                                // Remove Selected Date Rect Class and set to unselected
                                d3.selectAll('.day').classed('selected-rect', false).attr({
                                    'stroke': visual.DATE_UNSELECTED_COLOR
                                });
                                var anchor = self.stateManager.getAnchor();
                                if (anchor == null) {
                                    self.stateManager.setAnchor(d.date);
                                    anchor = currentClickDate;
                                }
                                minShift = currentClickDate < anchor ? currentClickDate : anchor;
                                maxShift = currentClickDate > anchor ? currentClickDate : anchor;
                                selectedIds = [];
                                // Get all selection Ids between the min and max dates
                                var selectedDataPoints = _.filter(dataPoints, function (dataPoint) { return dataPoint.date >= minShift && dataPoint.date <= maxShift; });
                                _.each(selectedDataPoints, function (dp) {
                                    if (dp.selectionId != null) {
                                        selectedIds.push(dp.selectionId);
                                    }
                                });
                            }
                            else {
                                singleSelect = true;
                                if (selectedIds.length) {
                                    selectedIds = [];
                                }
                                selectedIds.push(d.selectionId);
                                self.stateManager.setAnchor(d.date);
                            }
                            // Allow selection only if visual is rendered in a view that supports interactivty (e.g. Reports)
                            self.selectionManager.select(selectedIds).then(function (ids) {
                                if (!mouseEvent_1.ctrlKey && mouseEvent_1.shiftKey) {
                                    d3.selectAll('.day').filter(function (d) {
                                        var cdp = d;
                                        return cdp.date >= minShift && cdp.date <= maxShift ? true : false;
                                    }).classed('selected-rect', true).attr({
                                        'stroke': visual.DATE_SELECTED_COLOR
                                    }).each(function () {
                                        // Move selection to front
                                        this.parentNode.appendChild(this);
                                    });
                                }
                                else {
                                    var isSelected = d3.select(_this).attr("stroke") == visual.DATE_UNSELECTED_COLOR.toString() ? false : true;
                                    if (singleSelect) {
                                        // If single click remove all selected style
                                        d3.selectAll('.day').classed('selected-rect', false);
                                    }
                                    if (!isSelected || (singleSelect && wasMultiSelect)) {
                                        d3.select(_this).classed('selected-rect', true);
                                    }
                                    else {
                                        d3.select(_this).classed('selected-rect', false);
                                    }
                                    // Unselect all days
                                    d3.selectAll('.day').attr({ 'stroke': visual.DATE_UNSELECTED_COLOR });
                                    // Select all rects with selected-rect class
                                    d3.selectAll('.selected-rect').attr({ 'stroke': visual.DATE_SELECTED_COLOR })
                                        .each(function () {
                                        // Move selection to front
                                        this.parentNode.appendChild(this);
                                    });
                                }
                            });
                        }
                        // Month Zoom Specific
                        if (1 /* MONTH */ == self.stateManager.getZoomLevel()) {
                            // Insure Day Numbers are rendered first
                            self.calendarContainerGroup.selectAll('.dayNumberBox').each(function () {
                                // Move selection to front
                                this.parentNode.appendChild(this);
                            });
                            self.calendarContainerGroup.selectAll('.dayNumber').each(function () {
                                // Move selection to front
                                this.parentNode.appendChild(this);
                            });
                            var selectedRectsInMonth = d3.selectAll('.selected-rect');
                            if (selectedRectsInMonth[0].length == 0) {
                                self.stateManager.selectMonth(self.viewModel, self.stateManager.getSelectedMonth(), self.stateManager.getSelectedYear());
                            }
                        }
                    });
                };
                /**
                 * Creates a view for each drill down level.
                 * @method
                 */
                ViewManager.prototype.renderDrillDownView = function () {
                    // Clear SVG
                    d3.selectAll('.calendarContainer').remove();
                    var svg = this.calendarSVG;
                    this.calendarContainerGroup = svg.append('g')
                        .classed('calendarContainer', true);
                    this.yearViewLayout;
                    // Get Size of SVG
                    this.calendarSVG.attr({
                        width: this.yearViewLayout.svgWidth,
                        height: this.yearViewLayout.svgHeight
                    });
                    var self = this;
                    var dataPoints = this.viewModel.drillDownDataPoints;
                    var numberOfBoxes = dataPoints.length;
                    var numberOfRows = this.yearViewLayout.numberOfRows;
                    var numberOfColumns = this.yearViewLayout.numberOfColumns;
                    var rectWidth = this.yearViewLayout.yearRectSize;
                    var padding = this.yearViewLayout.svgPadding;
                    var dataPointRects = this.calendarContainerGroup.selectAll('.calendarPoint').data(dataPoints);
                    dataPointRects.enter().append('rect').classed('calendarPoint', true)
                        .attr("width", rectWidth)
                        .attr("height", rectWidth)
                        .attr("x", function (data) {
                        var columnNumber = visual.getColumnNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                        var offset = columnNumber - 1;
                        return (self.yearViewLayout.yearRectSize * (columnNumber - 1)) + padding;
                    })
                        .attr("y", function (data) {
                        var rowNumber = visual.getRowNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                        return (self.yearViewLayout.yearRectSize * (rowNumber - 1)) + padding;
                    })
                        .attr('fill', function (data) {
                        return data.color;
                    })
                        .attr('stroke', function (data) {
                        return visual.DATE_UNSELECTED_COLOR; // TODO
                    })
                        .attr('stroke-width', "2px");
                    dataPointRects.exit().remove();
                    dataPointRects.enter().append('text').classed('calendarPointLabel', true)
                        .each(function (data) {
                        var categoryLabels = data.label.split(" ");
                        var indexOfQuarter = categoryLabels.indexOf("Qtr");
                        if (indexOfQuarter != -1) {
                            var quarterNumber = categoryLabels[indexOfQuarter + 1];
                            categoryLabels[indexOfQuarter] = categoryLabels[indexOfQuarter] + " " + quarterNumber;
                            categoryLabels.splice(indexOfQuarter + 1, 1);
                        }
                        var columnNumber = visual.getColumnNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                        // Font Size
                        var fontSize = (rectWidth * self.yearViewLayout.yearTitleRatio);
                        var offset = columnNumber - 1;
                        var xCoord = (self.yearViewLayout.yearRectSize * (columnNumber - 1)) + padding;
                        var centerOfRect = xCoord + +(self.yearViewLayout.yearRectSize / 2) /*Half of Rect*/;
                        var rowNumber = visual.getRowNumber(data.index, numberOfBoxes, numberOfColumns, numberOfRows, 0);
                        var yCoord = (self.yearViewLayout.yearRectSize * (rowNumber - 1)) + padding + (rectWidth / 2);
                        var _loop_1 = function (i) {
                            var label = visual.formatMonthCategory(categoryLabels[i]);
                            d3.select(this_1).append("tspan")
                                .text(label)
                                .attr("x", function (data) {
                                if (label.length <= 2) {
                                    return centerOfRect - (fontSize * .5);
                                }
                                else {
                                    return centerOfRect - fontSize;
                                }
                            })
                                .attr("y", function (data) {
                                if (categoryLabels.length > 1) {
                                    return yCoord + (i * fontSize) - (categoryLabels.length * fontSize * .2);
                                }
                                else {
                                    return yCoord;
                                }
                            })
                                .attr("font-size", function (data) {
                                return fontSize;
                            });
                        };
                        var this_1 = this;
                        for (var i = 0; i < categoryLabels.length; i++) {
                            _loop_1(i);
                        }
                    });
                    dataPointRects.exit().remove();
                    this.addDrillDownSelections(this.viewModel.drillDownDataPoints);
                    this.tooltipServiceWrapper.addTooltip(this.calendarContainerGroup.selectAll('.calendarPoint'), function (tooltipEvent) { return visual.getDrillDownTooltipData(tooltipEvent.data); }, function (tooltipEvent) { return tooltipEvent.data.selectionId; });
                };
                /**
                 * Adds selection capabilities to each data point on a drill dwon view.
                 * @method @private
                 * @param {DateDataPoint} dataPoints    -data points to add selection capabilities to
                 */
                ViewManager.prototype.addDrillDownSelections = function (dataPoints) {
                    // Add Selections
                    var self = this;
                    var yearRects = this.calendarContainerGroup.selectAll('.calendarPoint');
                    yearRects.on('click', function (d) {
                        var _this = this;
                        // Check to see if previously selected
                        var isSelected = d3.select(this).attr("stroke") == visual.DATE_UNSELECTED_COLOR.toString() ? false : true;
                        // Selection Power BI data points
                        self.selectionManager
                            .select(d.selectionId)
                            .then(function (ids) {
                            d3.selectAll('.calendarPoint').classed('selected-rect', false).attr({
                                'stroke': visual.DATE_UNSELECTED_COLOR
                            });
                            if (!isSelected) {
                                d3.select(_this).classed('selected-rect', true).attr({
                                    'stroke': visual.DATE_SELECTED_COLOR
                                }).each(function () {
                                    // Move selection to front
                                    this.parentNode.appendChild(this);
                                });
                            }
                            else {
                                d3.select(_this).classed('selected-rect', false);
                            }
                            self.calendarContainerGroup.selectAll('.calendarPointLabel').each(function () {
                                // Move selection to front
                                this.parentNode.appendChild(this);
                            });
                        });
                    });
                };
                /**
                 * sets and returns the x coordinate of day in date
                 * @method @private
                 * @param {Date} date                           -current year/month/day
                 * @param {number} monthOffSet                  -month offset
                 * @param {ZoomLevel} zoomLevel                 -current zoom level
                 * @param {DayConfiguration[]} dayIndexingArray -index of days in current month
                 * @returns {number}                            -x coordinate
                 */
                ViewManager.prototype.setXCoordinateOfDay = function (date, monthOffSet, zoomLevel, dayIndexingArray) {
                    var day = date.getDay();
                    var configuredDay = _.find(dayIndexingArray, function (f) { return f.actualDayIndex == day; });
                    if (zoomLevel === 0 /* ALL */) {
                        return (configuredDay.configuredDayIndex * this.layoutConfig.calendarDateRectSize) + monthOffSet;
                    }
                    else if (zoomLevel === 1 /* MONTH */) {
                        return (configuredDay.configuredDayIndex * this.layoutConfig.calendarDateRectSize) + monthOffSet + this.layoutConfig.calendarDateRectSize - 5;
                    }
                };
                /**
                 * sets and returns y coordinate of selected date
                 * @method @private
                 * @param {Date} date                           -current year/month/day
                 * @param {number} monthOffset                  -month offset
                 * @param {ZoomLevel} zoomLevel                 -current zoom level
                 * @param {number} weekStartDay                 -day number current week starts on
                 * @param {DayConfiguration[]} dayIndexingArray -index of days in current month
                 * @returns {number}                            -y coordinate
                 */
                ViewManager.prototype.setYCoordinateOfDay = function (date, monthOffset, zoomLevel, weekStartDay, dayIndexingArray) {
                    var firstDayOfWeekInMonth = d3.time.month.floor(date).getDay();
                    var firstDayOfMonth = d3.time.month.floor(date).getDay();
                    var distanceToFirstDay = _.find(dayIndexingArray, function (f) { return f.actualDayIndex == firstDayOfMonth; }).configuredDayIndex;
                    ;
                    firstDayOfWeekInMonth = firstDayOfWeekInMonth - weekStartDay;
                    var offset = distanceToFirstDay - 1;
                    var weekOfMonth = Math.floor(((date.getDate() + offset) / 7));
                    if (zoomLevel === 0 /* ALL */) {
                        return (weekOfMonth * this.layoutConfig.calendarDateRectSize + visual.TOP_PAD_DATES_ALL_ZOOM) + monthOffset;
                    }
                    else if (zoomLevel === 1 /* MONTH */) {
                        return (weekOfMonth * this.layoutConfig.calendarDateRectSize + visual.TOP_PAD_DATES_ALL_ZOOM) + monthOffset + 15;
                    }
                };
                /**
                 * Clears selected datapoint and removes selection visual
                 * @method @private
                 */
                ViewManager.prototype.clearVisualSelections = function () {
                    d3.selectAll('rect').classed('selected-rect', false).attr({
                        'stroke': visual.DATE_UNSELECTED_COLOR
                    });
                    this.selectionManager.clear();
                };
                return ViewManager;
            }());
            visual.ViewManager = ViewManager;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            var Color;
            (function (Color) {
                Color[Color["WHITE"] = 0] = "WHITE";
                Color[Color["GREY"] = 1] = "GREY";
            })(Color = visual.Color || (visual.Color = {}));
            var Month;
            (function (Month) {
                Month[Month["JAN"] = 0] = "JAN";
                Month[Month["FEB"] = 1] = "FEB";
                Month[Month["MAR"] = 2] = "MAR";
                Month[Month["APR"] = 3] = "APR";
                Month[Month["MAY"] = 4] = "MAY";
                Month[Month["JUN"] = 5] = "JUN";
                Month[Month["JUL"] = 6] = "JUL";
                Month[Month["AUG"] = 7] = "AUG";
                Month[Month["SEP"] = 8] = "SEP";
                Month[Month["OCT"] = 9] = "OCT";
                Month[Month["NOV"] = 10] = "NOV";
                Month[Month["DEC"] = 11] = "DEC";
            })(Month = visual.Month || (visual.Month = {}));
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            ;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            /**
             * @class
             * Configuration for calendar layout
             */
            var LayoutConfiguration = (function () {
                /**
                 * creates a new instance of LayoutConfiguration.
                 * Sets viewport width and height, calendar configurations, min and max dates, and zoom level
                 * @constructor
                 * @param viewPortWidth
                 * @param viewPortHeight
                 * @param configurations
                 * @param minimumDate
                 * @param maximumDate
                 * @param zoomLevel
                 */
                function LayoutConfiguration(options, viewModel, zoomLevel) {
                    var numberOfMonths = zoomLevel == 0 /* ALL */ ? this.getMonthDiferrence(viewModel.minimumDate, viewModel.maximumDate) : 1;
                    var numberOfColumns = viewModel.configurations.numberColumns != null ? viewModel.configurations.numberColumns : viewModel.configurations.defaultNumberColumns;
                    this.horizontalMonthPadding = 20;
                    this.verticalMonthPadding = 20;
                    this.calendarDateRectSize = zoomLevel == 0 /* ALL */ ? 15 : 50;
                    this.monthTitleRatio = 0.6;
                    this.numberOfColumns = viewModel.configurations.scrollDirection == 0 ? numberOfColumns : visual.getNumberOfColumnsByRow(viewModel.configurations.numberRows, numberOfMonths);
                    this.numberOfRows = viewModel.configurations.scrollDirection == 1 ? viewModel.configurations.numberRows : visual.getNumberOfRowsByColumn(numberOfColumns, numberOfMonths);
                    this.numberOfMonths = numberOfMonths;
                    this.svgWidth = 0;
                    this.svgHeight = 0;
                    if (zoomLevel == 0 /* ALL */) {
                        if (viewModel.configurations.scrollDirection == 0) {
                            var verticalScrollRectSize = options.viewport.width / ((8.33 * this.numberOfColumns) + 1.33); // View Port Width / (Month Size + Padding) 
                            this.calendarDateRectSize = verticalScrollRectSize < 15 ? 15 : verticalScrollRectSize;
                            this.horizontalMonthPadding = this.calendarDateRectSize * 1.33;
                            this.verticalMonthPadding = this.calendarDateRectSize * 1.33;
                            this.svgWidth = ((this.numberOfColumns + 1) * this.horizontalMonthPadding) + (this.numberOfColumns * this.calendarDateRectSize * 7) - 20;
                            this.svgHeight = ((this.numberOfRows + 1) * this.verticalMonthPadding) + (this.numberOfRows * this.calendarDateRectSize * 7) + (this.numberOfRows * this.calendarDateRectSize) - this.verticalMonthPadding;
                        }
                        else if (viewModel.configurations.scrollDirection == 1) {
                            var horizontalScrollRectSize = options.viewport.height / ((this.numberOfRows * (7 + this.monthTitleRatio + 1 + 1.33)) + 1.33);
                            this.calendarDateRectSize = horizontalScrollRectSize < 15 ? 15 : horizontalScrollRectSize;
                            this.horizontalMonthPadding = this.calendarDateRectSize * 1.33;
                            this.verticalMonthPadding = this.calendarDateRectSize * 1.33;
                            this.svgWidth = ((this.numberOfColumns + 1) * this.horizontalMonthPadding) + (this.numberOfColumns * this.calendarDateRectSize * 7) - 20;
                            this.svgHeight = ((this.numberOfRows + 1) * this.verticalMonthPadding) + (this.numberOfRows * this.calendarDateRectSize * 7) + (this.numberOfRows * this.calendarDateRectSize) - this.verticalMonthPadding;
                        }
                    }
                    else {
                        this.calendarDateRectSize = ((options.viewport.width) - (this.horizontalMonthPadding * 2)) / 8;
                        this.svgWidth = (this.horizontalMonthPadding * 2) + (7 * this.calendarDateRectSize) + 20;
                        this.svgHeight = (this.verticalMonthPadding * 2) + (8 * this.calendarDateRectSize) /*Days*/ + (this.monthTitleRatio * this.calendarDateRectSize) - 20;
                    }
                }
                /**
                 * gets the month difference between two dates
                 * @function @exports
                 * @param {Date} startDate  -start date
                 * @param {Date} endDate    -end date
                 * @returns {number}        difference between months
                 */
                LayoutConfiguration.prototype.getMonthDiferrence = function (startDate, endDate) {
                    var year1 = startDate.getFullYear();
                    var year2 = endDate.getFullYear();
                    var month1 = startDate.getMonth();
                    var month2 = endDate.getMonth();
                    if (month1 === 0) {
                        month1++;
                        month2++;
                    }
                    return (year2 - year1) * 12 + (month2 - month1) + 1;
                };
                return LayoutConfiguration;
            }());
            visual.LayoutConfiguration = LayoutConfiguration;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            /**
             * @class
             * configuration for a yearview layout
             */
            var YearViewLayoutConfiguration = (function () {
                /**
                 * creates a new instance of
                 * @param {number} viewPortWidth                    -width of viewport
                 * @param {number} viewPortHeight                   -height of viewport
                 * @param {CalendarConfigurations} configurations   -calendar configurations
                 * @param {number} numberOfYears                    -number of years in calendar
                 */
                function YearViewLayoutConfiguration(viewPortWidth, viewPortHeight, configurations, numberOfYears) {
                    var numberOfColumns = configurations.numberColumns != null ? configurations.numberColumns : configurations.defaultNumberColumns;
                    this.svgPadding = 30;
                    this.yearRectSize = 100;
                    this.numberOfColumns = configurations.scrollDirection == 0 ? numberOfColumns : visual.getNumberOfColumnsByRow(configurations.numberRows, numberOfYears);
                    this.numberOfRows = configurations.scrollDirection == 1 ? configurations.numberRows : visual.getNumberOfRowsByColumn(numberOfColumns, numberOfYears);
                    this.numberOfYears = numberOfYears;
                    this.svgWidth = 500;
                    this.svgHeight = 500;
                    this.yearTitleRatio = 0.18;
                    if (configurations.scrollDirection == 0) {
                        var verticalScrollRectSize = (viewPortWidth - (2 * this.svgPadding)) / (this.numberOfColumns);
                        this.yearRectSize = verticalScrollRectSize < 100 ? 100 : verticalScrollRectSize;
                        this.svgWidth = (this.yearRectSize * this.numberOfColumns) + (2 * this.svgPadding);
                        this.svgHeight = (this.yearRectSize * this.numberOfRows) + (2 * this.svgPadding);
                    }
                }
                return YearViewLayoutConfiguration;
            }());
            visual.YearViewLayoutConfiguration = YearViewLayoutConfiguration;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            /**
             * Encapulates the ITooltipService.
             * @class
             */
            var TooltipServiceWrapper = (function () {
                /**
                 * Creates a new instance of TooltipServiceWrapper.
                 * @constructor
                 * @param tooltipService    -tooltip service obtained from host
                 * @param rootElement       -root element
                 * @param handleTouchDelay  -touch delay in milliseconds
                 */
                function TooltipServiceWrapper(tooltipService, rootElement, handleTouchDelay) {
                    if (handleTouchDelay === void 0) { handleTouchDelay = visual.Default_Handle_Touch_Delay; }
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
                TooltipServiceWrapper.prototype.addTooltip = function (selection, getTooltipInfoDelegate, getDataPointIdentity, reloadTooltipDataOnMouseMove) {
                    var _this = this;
                    if (!selection || !this.visualHostTooltipService.enabled()) {
                        return;
                    }
                    var rootNode = this.rootElement;
                    // Mouse events
                    selection.on("mouseover.tooltip", function () {
                        // Ignore mouseover while handling touch events
                        if (!_this.canDisplayTooltip(d3.event))
                            return;
                        var tooltipEventArgs = _this.makeTooltipEventArgs(rootNode, true, false);
                        if (!tooltipEventArgs)
                            return;
                        var tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                        if (tooltipInfo == null)
                            return;
                        var selectionId = getDataPointIdentity(tooltipEventArgs);
                        _this.visualHostTooltipService.show({
                            coordinates: tooltipEventArgs.coordinates,
                            isTouchEvent: false,
                            dataItems: tooltipInfo,
                            identities: selectionId ? [selectionId] : [],
                        });
                    });
                    selection.on("mouseout.tooltip", function () {
                        _this.visualHostTooltipService.hide({
                            isTouchEvent: false,
                            immediately: false,
                        });
                    });
                    selection.on("mousemove.tooltip", function () {
                        // Ignore mousemove while handling touch events
                        if (!_this.canDisplayTooltip(d3.event))
                            return;
                        var tooltipEventArgs = _this.makeTooltipEventArgs(rootNode, true, false);
                        if (!tooltipEventArgs)
                            return;
                        var tooltipInfo;
                        if (reloadTooltipDataOnMouseMove) {
                            tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                            if (tooltipInfo == null)
                                return;
                        }
                        var selectionId = getDataPointIdentity(tooltipEventArgs);
                        _this.visualHostTooltipService.move({
                            coordinates: tooltipEventArgs.coordinates,
                            isTouchEvent: false,
                            dataItems: tooltipInfo,
                            identities: selectionId ? [selectionId] : [],
                        });
                    });
                    // --- Touch events ---
                    var touchStartEventName = TooltipServiceWrapper.touchStartEventName();
                    var touchEndEventName = TooltipServiceWrapper.touchEndEventName();
                    var isPointerEvent = TooltipServiceWrapper.usePointerEvents();
                    selection.on(touchStartEventName + '.tooltip', function () {
                        _this.visualHostTooltipService.hide({
                            isTouchEvent: true,
                            immediately: true,
                        });
                        var tooltipEventArgs = _this.makeTooltipEventArgs(rootNode, isPointerEvent, true);
                        if (!tooltipEventArgs)
                            return;
                        var tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                        var selectionId = getDataPointIdentity(tooltipEventArgs);
                        _this.visualHostTooltipService.show({
                            coordinates: tooltipEventArgs.coordinates,
                            isTouchEvent: true,
                            dataItems: tooltipInfo,
                            identities: selectionId ? [selectionId] : [],
                        });
                    });
                    selection.on(touchEndEventName + '.tooltip', function () {
                        _this.visualHostTooltipService.hide({
                            isTouchEvent: true,
                            immediately: false,
                        });
                        if (_this.handleTouchTimeoutId)
                            clearTimeout(_this.handleTouchTimeoutId);
                        // At the end of touch action, set a timeout that will let us ignore the incoming mouse events for a small amount of time
                        // TODO: any better way to do this?
                        _this.handleTouchTimeoutId = setTimeout(function () {
                            _this.handleTouchTimeoutId = undefined;
                        }, _this.handleTouchDelay);
                    });
                };
                /**
                 * Hides tooltip.
                 * @method @public
                 */
                TooltipServiceWrapper.prototype.hide = function () {
                    this.visualHostTooltipService.hide({ immediately: true, isTouchEvent: false });
                };
                /**
                 * Creates and returns a tooltip delegate with a specific HTML Element target
                 * @method @private
                 * @param {Element} rootNode            -root node
                 * @param {boolean} isPointerEvent      -true if is a pointer event, false otherwise
                 * @param {boolean} isTouchEvent        -true if is a pointer event, false otherwise
                 * @returns {TooltipEventArgs<T>}       -the created tooltip delegate
                 */
                TooltipServiceWrapper.prototype.makeTooltipEventArgs = function (rootNode, isPointerEvent, isTouchEvent) {
                    var target = d3.event.target;
                    var data = d3.select(target).datum();
                    var mouseCoordinates = this.getCoordinates(rootNode, isPointerEvent);
                    var elementCoordinates = this.getCoordinates(target, isPointerEvent);
                    var tooltipEventArgs = {
                        data: data,
                        coordinates: mouseCoordinates,
                        elementCoordinates: elementCoordinates,
                        context: target,
                        isTouchEvent: isTouchEvent
                    };
                    return tooltipEventArgs;
                };
                /**
                 * Determines if a tooltip can be displayed during the given event
                 * @method @private
                 * @param {any} d3Event -any event
                 * @returns {boolean}   -true if tooltip can be displayed for given event, false otherwise
                 */
                TooltipServiceWrapper.prototype.canDisplayTooltip = function (d3Event) {
                    var canDisplay = true;
                    var mouseEvent = d3Event;
                    if (mouseEvent.buttons !== undefined) {
                        // Check mouse buttons state
                        var hasMouseButtonPressed = mouseEvent.buttons !== 0;
                        canDisplay = !hasMouseButtonPressed;
                    }
                    // Make sure we are not ignoring mouse events immediately after touch end.
                    canDisplay = canDisplay && (this.handleTouchTimeoutId == null);
                    return canDisplay;
                };
                /**
                 * Retrieves the coordinates for the selected element
                 * @method @private
                 * @param rootNode          -the selected element
                 * @param isPointerEvent    -true if the event is a pointer event, false otherwise
                 */
                TooltipServiceWrapper.prototype.getCoordinates = function (rootNode, isPointerEvent) {
                    var coordinates;
                    if (isPointerEvent) {
                        // DO NOT USE - WebKit bug in getScreenCTM with nested SVG results in slight negative coordinate shift
                        // Also, IE will incorporate transform scale but WebKit does not, forcing us to detect browser and adjust appropriately.
                        // Just use non-scaled coordinates for all browsers, and adjust for the transform scale later (see lineChart.findIndex)
                        //coordinates = d3.mouse(rootNode);
                        // copied from d3_eventSource (which is not exposed)
                        var e = d3.event, s = void 0;
                        while (s = e.sourceEvent)
                            e = s;
                        var rect = rootNode.getBoundingClientRect();
                        coordinates = [e.clientX - rect.left - rootNode.clientLeft, e.clientY - rect.top - rootNode.clientTop];
                    }
                    else {
                        var touchCoordinates = d3.touches(rootNode);
                        if (touchCoordinates && touchCoordinates.length > 0) {
                            coordinates = touchCoordinates[0];
                        }
                    }
                    return coordinates;
                };
                /**
                 * Provides a name for a touch start event
                 * @method @private
                 * @returns {string}    -event name
                 */
                TooltipServiceWrapper.touchStartEventName = function () {
                    var eventName = "touchstart";
                    if (window["PointerEvent"]) {
                        // IE11
                        eventName = "pointerdown";
                    }
                    return eventName;
                };
                /**
                 * Provides a name for a touch move event
                 * @method @private
                 * @returns {string}    -event name
                 */
                TooltipServiceWrapper.touchMoveEventName = function () {
                    var eventName = "touchmove";
                    if (window["PointerEvent"]) {
                        // IE11
                        eventName = "pointermove";
                    }
                    return eventName;
                };
                /**
                 * Provides a name for a touch end event
                 * @private @method
                 * @returns {string}    -event name
                 */
                TooltipServiceWrapper.touchEndEventName = function () {
                    var eventName = "touchend";
                    if (window["PointerEvent"]) {
                        // IE11
                        eventName = "pointerup";
                    }
                    return eventName;
                };
                /**
                 * Determines if touch start event is a pointer event
                 * @private @method
                 * @returns {boolean}   -true if event is a pointer event, false otherwise
                 */
                TooltipServiceWrapper.usePointerEvents = function () {
                    var eventName = TooltipServiceWrapper.touchStartEventName();
                    return eventName === "pointerdown" || eventName === "MSPointerDown";
                };
                return TooltipServiceWrapper;
            }());
            visual.TooltipServiceWrapper = TooltipServiceWrapper;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            var Visual = (function () {
                /**
                 * Creates and instance of the calendar. This is only called once.
                 * @constructor
                 * @param {VisualConstructorOptions} options    -Contains references to the element that will contain the visual
                 *                                              and a reference to the host which contains services.
                 */
                function Visual(options) {
                    this.host = options.host;
                    var selectionManager = options.host.createSelectionManager();
                    var stateManager = new visual.StateManager(selectionManager);
                    var tooltipServiceWrapper = new visual.TooltipServiceWrapper(this.host.tooltipService, options.element);
                    // For scrollable
                    options.element.style.overflow = 'auto';
                    var calendarSVG = d3.select(options.element)
                        .append('svg')
                        .classed('calendarSVG', true);
                    var calendarContainerGroup = calendarSVG.append('g')
                        .classed('calendarContainer', true);
                    this.viewManager = new visual.ViewManager(calendarSVG, calendarContainerGroup, tooltipServiceWrapper, stateManager);
                }
                /**
                 * Updates the state of the calendar. Every sequential databinding and resizing will call update
                 * @method
                 * @param {VisualUpdateOptions} options -Contains references to the size of the container and the dataView which contains
                 *                                      all the data the visual had queried.
                 */
                Visual.prototype.update = function (options) {
                    if (this.viewManager.stateManager.isBookmark) {
                        this.viewManager.stateManager.isBookmark = false;
                        return;
                    }
                    // Build View Model
                    var viewModel = this.visualTransform(options, this.host);
                    d3.selectAll('.calendarContainer').remove();
                    var svg = this.viewManager.calendarSVG;
                    this.viewManager.calendarContainerGroup = svg.append('g').classed('calendarContainer', true);
                    // Render appropriate Zoom level
                    this.viewManager.renderCalendar(options, viewModel);
                    // Select all rects with selected-rect class
                    d3.selectAll('.selected-rect').attr({ 'stroke': visual.DATE_SELECTED_COLOR })
                        .each(function () {
                        // Move selection to front
                        this.parentNode.appendChild(this);
                    });
                };
                /**
                 * Enumerates through the objects defined in the capabilities and adds the properties to the format pane.
                 * Allows you to select which of the objects and properties you want to expose to the users in the property pane.
                 * Objects and properties need to be defined in capabilities.json.
                 * @method
                 * @param {EnumerateVisualObjectInstancesOptions} options   -Map of defined objects.
                 * @returns {VisualObjectInstance[]}                        enumerated objects from capabilities.json
                 */
                Visual.prototype.enumerateObjectInstances = function (options) {
                    var objectName = options.objectName;
                    var calendarConfiguration = this.viewManager.viewModel.configurations;
                    var instances = [];
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
                            });
                            break;
                        case 'dataPoint':
                            var dataPoint = {
                                objectName: objectName,
                                selector: null,
                                properties: {
                                    defaultColor: calendarConfiguration.dataPoint
                                }
                            };
                            instances.push(dataPoint);
                            break;
                        case 'calendar':
                            instances.push({
                                objectName: objectName,
                                selector: null,
                                properties: {
                                    weekStartDay: calendarConfiguration.weekStartDay,
                                    scrollDirection: calendarConfiguration.scrollDirection
                                }
                            });
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
                };
                /**
                 * Function that converts queried data into a view model that will be used by the visual.
                 *
                 * @method
                 * @param {VisualUpdateOptions} options -contains references to the container size and the dataView which contains
                 *                                      all queried data.
                 * @param {IVisualHost} host            -contains references to the host which contains services.
                 * @returns {CalendarViewModel}         -view model representing the calendar visual
                 */
                Visual.prototype.visualTransform = function (options, host) {
                    var dataViews = options.dataViews;
                    // Default Config
                    var defaultConfig = {
                        dataPoint: { solid: { color: '#01B8AA' } },
                        weekStartDay: 0,
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
                    var viewModel = {
                        dataPoints: [],
                        drillDownDataPoints: [],
                        configurations: {},
                        dayIndexingArray: [],
                        minimumDate: new Date("January 1, 1900 00:00:00"),
                        maximumDate: new Date("January 1, 1900 00:00:00"),
                        drillDownInfo: {
                            isDrillDown: false,
                            allowStandardCalendar: false,
                            dates: [],
                            labels: []
                        }
                    };
                    if (!dataViews
                        || !dataViews[0]
                        || !dataViews[0].categorical
                        || !dataViews[0].categorical.categories
                        || !dataViews[0].categorical.categories[0].source
                        || !dataViews[0].categorical.values
                        || dataViews[0].categorical.categories[0].values.length == 0) {
                        return viewModel;
                    }
                    var objects = dataViews[0].metadata.objects;
                    // Set Configurations
                    var calendarConfig = {
                        dataPoint: visual.getValue(objects, 'dataPoint', 'defaultColor', defaultConfig.dataPoint),
                        weekStartDay: visual.getValue(objects, 'calendar', 'weekStartDay', defaultConfig.weekStartDay),
                        scrollDirection: 0,
                        numberColumns: visual.getValue(objects, 'calendar', 'numberColumns', defaultConfig.numberColumns),
                        defaultNumberColumns: 3,
                        numberRows: 0,
                        diverging: {
                            diverging: visual.getValue(objects, 'diverging', 'diverging', defaultConfig.diverging.diverging),
                            minColor: visual.getValue(objects, 'diverging', 'minColor', defaultConfig.diverging.minColor),
                            centerColor: visual.getValue(objects, 'diverging', 'centerColor', defaultConfig.diverging.centerColor),
                            maxColor: visual.getValue(objects, 'diverging', 'maxColor', defaultConfig.diverging.maxColor),
                            minValue: visual.getValue(objects, 'diverging', 'minValue', defaultConfig.diverging.minValue),
                            centerValue: visual.getValue(objects, 'diverging', 'centerValue', defaultConfig.diverging.centerValue),
                            maxValue: visual.getValue(objects, 'diverging', 'maxValue', defaultConfig.diverging.maxValue),
                        }
                    };
                    viewModel.configurations = calendarConfig;
                    var configurations = calendarConfig;
                    viewModel.dayIndexingArray = visual.getDayConfigurationArray(calendarConfig.weekStartDay);
                    // Get Data Point Color
                    var dataPointColor = configurations.dataPoint.solid.color;
                    var dates = dataViews[0].categorical.categories[0].values;
                    var values = dataViews[0].categorical.values[0].values;
                    var drillDownInfo = visual.checkDrillDownRequirements(dataViews, dates);
                    viewModel.drillDownInfo = drillDownInfo;
                    dates = drillDownInfo.dates;
                    if (viewModel.drillDownInfo.isDrillDown && !viewModel.drillDownInfo.allowStandardCalendar) {
                        viewModel.drillDownDataPoints = visual.getDrillDownDataPoints(viewModel, options, host);
                    }
                    else {
                        // Standard Calendar
                        viewModel.dataPoints = visual.getDayDataPoints(dates, values, viewModel, options, host);
                    }
                    return viewModel;
                };
                return Visual;
            }());
            visual.Visual = Visual;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
//# sourceMappingURL=visual.js.map