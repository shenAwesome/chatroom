var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var sd;
(function (sd) {
    var SEvent = (function () {
        function SEvent(type) {
            this.type = type;
        }
        return SEvent;
    })();

    var EventBus = (function () {
        function EventBus(parent) {
            this.handlers = {};
            this.parent = parent;
        }
        EventBus.prototype.dispatch = function (evt) {
            var handlers = this.getHandlers(evt.type).reverse();
            handlers.every(function (handler) {
                return !(handler(evt) === false);
            });
            if (this.parent) {
                this.parent.dispatch(evt);
            }
        };

        EventBus.prototype.addHandler = function (type, Handler) {
            sd.arrayInsert(this.getHandlers(type), Handler);
        };

        EventBus.prototype.removeHandler = function (type, Handler) {
            sd.arrayRemove(this.getHandlers(type), Handler);
        };

        EventBus.prototype.getHandlers = function (type) {
            this.handlers[type] = this.handlers[type] || [];
            return this.handlers[type];
        };
        return EventBus;
    })();

    var Listener = (function () {
        function Listener(handlers) {
            this.binds = [];
            if (handlers) {
                for (var type in handlers) {
                    this['on' + type] = handlers[type];
                }
            }
            this.bindAll();
        }
        Listener.prototype._bind = function (type, handler) {
        };

        Listener.prototype._unbind = function (type, handler) {
        };

        Listener.prototype.bindAll = function () {
            this.unbindAll();
            for (var k in this) {
                if (k.indexOf('on') == 0) {
                    var type = k.substring(2).toLowerCase();
                    var bind = this[k].bind(this);
                    bind.type = type;
                    this._bind(type, bind);
                    this.binds.push(bind);
                }
            }
        };

        Listener.prototype.unbindAll = function () {
            this.binds.forEach(function (bind) {
                this._unbind(bind.type, bind);
            }, this);
            this.binds.length = 0;
        };
        return Listener;
    })();
    sd.Listener = Listener;

    var DomListener = (function (_super) {
        __extends(DomListener, _super);
        function DomListener(element, handlers) {
            if (typeof element === "undefined") { element = window; }
            this.element = element;
            _super.call(this, handlers);
        }
        DomListener.prototype._bind = function (type, handler) {
            if (this.element) {
                this.element.addEventListener(type, handler);
            }
        };

        DomListener.prototype._unbind = function (type, handler) {
            if (this.element) {
                this.element.removeEventListener(type, handler);
            }
        };

        DomListener.prototype.fire = function (type, attr) {
            var event = document.createEvent('Event');
            event.initEvent(type.toLowerCase(), true, true);
            if (attr) {
                for (var k in attr) {
                    event[k] = attr[k];
                }
            }
            this.element.dispatchEvent(event);
        };
        return DomListener;
    })(Listener);
    sd.DomListener = DomListener;

    var Pixel = (function () {
        function Pixel(x, y) {
            this.x = x;
            this.y = y;
            this.timestamp = Date.now();
        }
        return Pixel;
    })();

    function distance(point1, point2) {
        var xs = point2.x - point1.x;
        var ys = point2.y - point1.y;
        return Math.sqrt(xs * xs + ys * ys);
    }

    function isChild(parent, child) {
        if (parent == child) {
            return true;
        }
        while (child.parentNode) {
            if (parent == child.parentNode) {
                return true;
            }
            child = child.parentNode;
        }
        return false;
    }

    var EventManager = (function (_super) {
        __extends(EventManager, _super);
        function EventManager() {
            _super.apply(this, arguments);
            this.pullStart = false;
            this.timers = {};
            this.clicks = 0;
            this.skips = [];
        }
        EventManager.enable = function () {
            if (!EventManager.instance) {
                EventManager.instance = new EventManager();
            }
        };

        EventManager.prototype.skip = function (element) {
            sd.arrayInsert(this.skips, element);
        };

        EventManager.prototype._schedule = function (type, func, delay) {
            if (typeof delay === "undefined") { delay = 150; }
            this._cancel(type);
            var that = this;
            this.timers[type] = setTimeout(function () {
                func.apply(that);
                that.timers[type] = null;
            }, delay);
        };

        EventManager.prototype._cancel = function (type) {
            if (this.timers[type]) {
                clearTimeout(this.timers[type]);
                this.timers[type] = null;
            }
        };

        EventManager.prototype.fireEvent = function (type, evt) {
            if (!this.target) {
                return;
            }
            var event = document.createEvent('Event');
            event.initEvent(type.toLowerCase(), true, true);
            event.clientX = evt.clientX;
            event.clientY = evt.clientY;
            event.x = evt.clientX;
            event.y = evt.clientY;
            event.button = evt.button;
            if (this.downPosition) {
                event.start = this.downPosition;
                event.offsetX = event.clientX - event.start.x;
                event.offsetY = event.clientY - event.start.y;
            }
            event.originalTarget = evt.target;
            this.target.dispatchEvent(event);
            return event;
        };

        EventManager.prototype.onMouseDown = function (evt) {
            this.downPosition = new Pixel(evt.clientX, evt.clientY);
            this.pullStart = false;
            this.target = evt.target;
            if (this.skips.length) {
                var target = evt.target;
                var skip = this.skips.every(function (sk) {
                    return isChild(sk, target);
                });
                if (skip) {
                    this.target = null;
                    return;
                }
            }

            this._schedule('hold', function () {
                this.fireEvent('hold', evt);
            });

            if (this.clicks > 0 && distance({ x: evt.clientX, y: evt.clientY }, this.downPosition) < 10) {
                this.fireEvent('dbtap', evt);
                this._cancel('click');
                this.clicks = 0;
                return;
            }
            this.clicks++;
        };

        EventManager.prototype.onMouseMove = function (evt) {
            var mp;
            mp = this.downPosition;
            if (mp) {
                var event;
                if (!this.pullStart) {
                    this.pullStart = true;
                    this.fireEvent('pullstart', evt);
                } else {
                    this.fireEvent('pullmove', evt);
                }
            }
            this._cancel('hold');
        };

        EventManager.prototype.onMouseUp = function (evt) {
            if (!this.downPosition) {
                return;
            }
            var that = this;
            var holdTime = Date.now() - this.downPosition.timestamp;
            if (this.clicks == 1 && holdTime < 200 && distance({ x: evt.clientX, y: evt.clientY }, this.downPosition) < 10) {
                this._schedule('click', function () {
                    that.fireEvent('tap', evt);
                    that.clicks = 0;
                });
            } else {
                that.clicks = 0;
            }

            this.downPosition = null;
            if (this.pullStart) {
                this.fireEvent('pullend', evt);
            }
            this._cancel('hold');
        };
        return EventManager;
    })(DomListener);
    sd.EventManager = EventManager;
    sd.EventManager.enable();

    document.onselectstart = function (e) {
        var t = e.target;
        if (t.nodeName != "INPUT" && t.nodeName != "TEXTAREA") {
            e.preventDefault();
            return false;
        }
        return true;
    };
})(sd || (sd = {}));
var sd;
(function (sd) {
    var Component = (function (_super) {
        __extends(Component, _super);
        function Component(element) {
            _super.call(this, null);
            this.location = new sd.Point();
            this.size = new sd.Dimension();
            this.minSize = new sd.Dimension(100, 30);
            this.visiblity = true;
            this.margin = 0;
            this.iconPath = 'img';
            this.children = [];
            this.id = (Component.SEQUENCE++).toString();
            this.initialized = false;
            this.timer = {};
            this.supressEvent = false;
            if (!element) {
                element = document.createElement('div');
            } else if (typeof element == 'string') {
                element = document.createElement(element);
            }
            this.element = element;
            element.component = this;
            this.addClass(this.getClassName());
            this.setMargin(0);
            var that = this;
            setTimeout(function () {
                that.init();
                that.initialized = true;
            }, 1);
            this.attr('unselectable', 'on');
        }
        Component.prototype.save = function () {
            var key = 'size_' + this.getId();
            localStorage.setItem(key, this.size.toString());
        };

        Component.prototype.restore = function () {
            var key = 'size_' + this.getId();
            var size = localStorage.getItem(key);
            if (size) {
                this.prefSize = new sd.Dimension().read(size);
            }
        };

        Component.prototype.getId = function () {
            if (this.parent) {
                return this.parent.getId() + '_' + this.id;
            }
            return this.id;
        };

        Component.prototype.init = function () {
            this.bindAll();
        };

        Component.prototype.setLocation = function (x, y) {
            if (isNaN(x) || isNaN(y)) {
                return this;
            }

            x = parseInt(x);
            y = parseInt(y);
            this.cssPx('left', x);
            this.cssPx('top', y);
            this.css('position', 'absolute');
            this.location.set(x, y);
            return this;
        };

        Component.prototype.setSize = function (w, h) {
            if (!this.visiblity) {
                return;
            }
            if (isNaN(w) || isNaN(h)) {
                return this;
            }
            this.size.set(w, h);
            var off = this.margin * 2;
            this.cssPx('width', this.size.width - off);
            this.cssPx('height', this.size.height - off);
            this.fireEvent('resize');
            return this;
        };

        Component.prototype.setBox = function (box, y, w, h) {
            if (arguments.length == 4) {
                box = {
                    x: box,
                    y: y,
                    w: w,
                    h: h
                };
            }

            box.w = Math.max(box.w, this.minSize.width);
            box.h = Math.max(box.h, this.minSize.height);
            if (this.parent) {
                var pSize = this.parent.size;
                box.w = Math.min(box.w, pSize.width);
                box.h = Math.min(box.h, pSize.height);
                box.x = sd.range(box.x, 0, pSize.width - box.w);
                box.y = sd.range(box.y, 0, pSize.height - box.h);
            }
            this.setLocation(box.x, box.y);
            this.set(box.w, box.h);
        };
        Component.prototype.getBox = function () {
            return {
                x: this.location.x,
                y: this.location.y,
                w: this.size.width,
                h: this.size.height
            };
        };

        Component.prototype.setPreferredSize = function (w, h) {
            this.prefSize = new sd.Dimension(w, h);
            return this;
        };

        Component.prototype.forceLayout = function () {
            var p = this;
            while (p.parent) {
                p = p.parent;
                p.prefSize = null;
            }
            p.doLayout();
        };

        Component.prototype.doLayout = function () {
        };

        Component.prototype.getPreferredSize = function () {
            if (!this.visiblity) {
                return new sd.Dimension(0, 0);
            }
            return this.prefSize;
        };

        Component.prototype.set = function (w, h) {
            if (typeof w === "undefined") { w = 20; }
            if (typeof h === "undefined") { h = 20; }
            if (arguments.length == 1) {
                h = w;
            }
            this.setPreferredSize(w, h);
            this.setSize(w, h);
            return this;
        };

        Component.prototype.cssPx = function (key, value) {
            return this.css(key, value + 'px');
        };

        Component.prototype.css = function (key, value) {
            var style = this.element.style;
            style[key] = value.toString();
            return this;
        };

        Component.prototype.attr = function (key, value) {
            this.element.setAttribute(key, value);
            return this;
        };

        Component.prototype.html = function (innerHTML) {
            this.element.innerHTML = innerHTML;
            return this;
        };

        Component.prototype.$ = function (selector, all) {
            if (all) {
                return this.element.querySelectorAll(selector);
            }
            return this.element.querySelector(selector);
        };

        Component.prototype.on = function (type, listener) {
            this.element.addEventListener(type, listener);
        };

        Component.prototype.off = function (type, listener) {
            this.element.removeEventListener(type, listener);
        };

        Component.prototype.getClassName = function () {
            var funcNameRegex = /function (.{1,})\(/;
            var results = (funcNameRegex).exec((this).constructor.toString());
            return (results && results.length > 1) ? results[1] : "";
        };

        Component.prototype.addClass = function (name) {
            var styles = this.element.className.split(' ');
            sd.arrayAdd(styles, name);
            this.element.className = sd.trim(styles.join(' '));
            return this;
        };

        Component.prototype.removeClass = function (name) {
            var styles = this.element.className.split(' ');
            sd.arrayRemove(styles, name);
            this.element.className = sd.trim(styles.join(' '));
            return this;
        };

        Component.prototype.hasClass = function (name) {
            var styles = this.element.className.split(' ');
            return (styles.indexOf(name) != -1);
        };

        Component.prototype.setClass = function (name) {
            this.element.className = name;
            return this;
        };

        Component.prototype.attach = function (ele) {
            this.css('position', 'relative');
            var addTo;
            if (typeof ele == 'string') {
                addTo = document.getElementById(ele);
            } else if (ele) {
                addTo = ele;
            } else {
                addTo = document.body;
            }
            addTo.appendChild(this.element);
            this.detach();
            return this;
        };

        Component.prototype.detach = function () {
            if (this.parent) {
                this.parent['remove'](this);
            }
        };

        Component.prototype.fullScreen = function () {
            this.addClass('dragging');
            this.attach();
            var that = this;
            function onResize() {
                var w = window.innerWidth;
                var h = window.innerHeight;
                that.setSize(w, h);
            }
            window.addEventListener('resize', onResize);
            onResize();
            setTimeout(function () {
                that.removeClass('dragging');
            }, 100);
        };

        Component.prototype.centerInParent = function () {
            if (!this.parent) {
                return;
            }
            var x = (this.parent.size.width - this.size.width) / 2;
            var y = (this.parent.size.height - this.size.height) / 2;
            this.setLocation(x, y);
        };

        Component.prototype.setMargin = function (margin) {
            this.cssPx('margin', margin);
            this.margin = margin;
        };
        Component.prototype.schedule = function (func, type, delay) {
            if (typeof type === "undefined") { type = 'default'; }
            if (typeof delay === "undefined") { delay = 10; }
            if (this.timer[type]) {
                clearTimeout(this.timer[type]);
            }
            var that = this;
            this.timer[type] = setTimeout(function () {
                func.call(that);
                that.timer[type] = null;
            }, delay);
        };

        Component.prototype.fireEvent = function (evtType) {
            var _this = this;
            if (this.supressEvent) {
                return;
            }
            this.schedule(function () {
                _this.fire(evtType);
            }, evtType);
        };
        Component.prototype.clear = function () {
            this.element.innerHTML = '';
        };
        Component.prototype.setVisibility = function (visibility) {
            this.visiblity = visibility;
            this.css('display', visibility ? 'block' : 'none');
        };
        Component.prototype.show = function () {
            this.setVisibility(true);
        };
        Component.prototype.hide = function () {
            this.setVisibility(false);
        };
        Component.SEQUENCE = 0;
        return Component;
    })(sd.DomListener);
    sd.Component = Component;
})(sd || (sd = {}));
var sd;
(function (sd) {
    var Container = (function (_super) {
        __extends(Container, _super);
        function Container(ele) {
            _super.call(this, ele);
            this.insets = new sd.Insets();
            this.children = [];
            this.minSize.set(100, 100);
        }
        Container.prototype.getPreferredSize = function () {
            var pSize = _super.prototype.getPreferredSize.call(this);
            if (!pSize && this.layoutManager) {
                pSize = this.layoutManager.preferredLayoutSize();
            }
            return pSize;
        };

        Container.prototype.add = function (comp, layout) {
            comp.detach();
            comp.parent = this;
            sd.arrayAdd(this.children, comp);
            this.element.appendChild(comp.element);
            if (layout) {
                comp.layout = layout;
            }
            this.fireEvent('add');
            return comp;
        };

        Container.prototype.insert = function (comp, layout) {
            this.add(comp, layout);
            sd.arrayInsert(this.children, comp);
        };

        Container.prototype.insertBefore = function (comp, before, layout) {
            this.add(comp, layout);
            sd.arrayInsert(this.children, comp, before);
        };

        Container.prototype.replace = function (oldComp, comp) {
            this.element.appendChild(comp.element);
            this.element.removeChild(oldComp.element);
            var index = this.children.indexOf(oldComp);
            this.children[index] = comp;
            this.doLayout();
        };

        Container.prototype.remove = function (comp) {
            sd.arrayRemove(this.children, comp);
            this.element.removeChild(comp.element);
            comp.parent = null;
        };

        Container.prototype.clear = function () {
            var that = this;
            this.children.forEach(function (c) {
                that.remove(c);
            });
            this.children.length = 0;
        };

        Container.prototype.doLayout = function () {
            if (this.layoutManager) {
                this.layoutManager.layout();
            }
            this.children.forEach(function (child) {
            });
        };

        Container.prototype.setLayoutManager = function (manager) {
            this.layoutManager = manager;
            this.layoutManager.target = this;
            return this;
        };

        Container.prototype.setSize = function (w, h) {
            if (this.size.width == w && this.size.height == h) {
                return this;
            }
            _super.prototype.setSize.call(this, w, h);
            this.doLayout();
            return this;
        };

        Container.prototype.setBorder = function (border) {
            this.cssPx('borderWidth', border);
            this.insets.set(border);
            return this;
        };

        Container.prototype.getChild = function (element) {
            var ret = null;
            this.children.forEach(function (c) {
                if (sd.isParent(element, c.element)) {
                    ret = c;
                }
            });
            return ret;
        };
        Container.prototype.setIndex = function (child, index) {
            if (this.children.indexOf(child) == index) {
                return;
            }
            sd.arrayRemove(this.children, child);
            this.children.splice(index, 0, child);
            this.doLayout();
        };

        Container.prototype.restore = function () {
            _super.prototype.restore.call(this);
            this.children.forEach(function (child) {
                child.restore();
            });
        };
        return Container;
    })(sd.Component);
    sd.Container = Container;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var Panel = (function (_super) {
            __extends(Panel, _super);
            function Panel(w, h) {
                _super.call(this, document.createElement('div'));
                var isH = false;
                if (arguments['length'] == 2) {
                    this.set(w, h);
                } else if (arguments['length'] == 1) {
                    if (typeof w == 'boolean') {
                        isH = w;
                    } else if (typeof w == 'string') {
                        this.addClass(w);
                    } else {
                        this.setLayoutManager(w);
                    }
                }

                if (!this.layoutManager) {
                    this.setLayoutManager(new sd.layout.BoxLayout(isH));
                }
            }
            Panel.prototype.addDom = function (tag, attr) {
                var comp = new sd.Component(document.createElement(tag)).set(100, 24);
                if (attr)
                    for (var k in attr) {
                        comp.element.setAttribute(k, attr[k]);
                    }
                return this.add(comp);
            };
            return Panel;
        })(sd.Container);
        widget.Panel = Panel;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    var Dimension = (function () {
        function Dimension(width, height) {
            if (typeof width === "undefined") { width = 0; }
            if (typeof height === "undefined") { height = 0; }
            this.width = width;
            this.height = height;
        }
        Dimension.prototype.set = function (width, height) {
            if (width instanceof Dimension) {
                var d = width;
                width = d.width;
                height = d.height;
            }
            this.width = width;
            this.height = height;
            return this;
        };

        Dimension.prototype.min = function (dim) {
            ['width', 'height'].forEach(function (attr) {
                this[attr] = Math.max(this[attr], dim[attr]);
            }, this);
            return this;
        };

        Dimension.prototype.toString = function () {
            return this.width + ' ' + this.height;
        };

        Dimension.prototype.read = function (str) {
            try  {
                var wh = str.split(' ');
                var width = parseInt(wh[0]);
                var height = parseInt(wh[1]);
                this.set(width, height);
            } catch (e) {
            }
            return this;
        };
        return Dimension;
    })();
    sd.Dimension = Dimension;
})(sd || (sd = {}));
var sd;
(function (sd) {
    var Insets = (function () {
        function Insets() {
            this.left = 0;
            this.right = 0;
            this.top = 0;
            this.bottom = 0;
        }
        Insets.prototype.set = function (border) {
            'left,right,top,bottom'.split(',').forEach(function (key) {
                this[key] = border;
            }, this);
            return this;
        };
        return Insets;
    })();
    sd.Insets = Insets;
})(sd || (sd = {}));
var sd;
(function (sd) {
    var Point = (function () {
        function Point(x, y) {
            if (typeof x === "undefined") { x = null; }
            if (typeof y === "undefined") { y = null; }
            this.x = x;
            this.y = y;
        }
        Point.prototype.set = function (x, y) {
            this.x = x;
            this.y = y;
        };

        Point.prototype.toString = function () {
            return this.x + ' ' + this.y;
        };

        Point.prototype.read = function (str) {
            try  {
                var wh = str.split(' ');
                var x = parseInt(wh[0]);
                var y = parseInt(wh[1]);
                this.set(x, y);
            } catch (e) {
            }
            return this;
        };
        return Point;
    })();
    sd.Point = Point;
})(sd || (sd = {}));
var sd;
(function (sd) {
    function arrayRemove(array, item) {
        var index = array.indexOf(item, 0);
        if (index != -1) {
            array.splice(index, 1);
        }
    }
    sd.arrayRemove = arrayRemove;

    function arrayAdd(array, item, toFirst) {
        arrayRemove(array, item);
        if (toFirst) {
            array.unshift(item);
        } else {
            array.push(item);
        }
    }
    sd.arrayAdd = arrayAdd;

    function arrayInsert(array, item, beforeItem) {
        arrayRemove(array, item);
        if (beforeItem) {
            var index = array.indexOf(beforeItem);
            if (index != -1) {
                array.splice(index, 0, item);
            }
        } else {
            array.unshift(item);
        }
    }
    sd.arrayInsert = arrayInsert;

    function trim(str) {
        return str.replace(/^\s+|\s+$/g, "");
    }
    sd.trim = trim;

    function range(self, min, max) {
        if (min > max) {
            var t = max;
            max = min;
            min = t;
        }
        return Math.min(max, Math.max(self, min));
    }
    sd.range = range;

    function hasClass(node, clsName) {
        if (node && clsName) {
            var classes = (node.className || '').split(' ');
            return (classes.indexOf(clsName) != -1);
        }
        return false;
    }
    sd.hasClass = hasClass;

    function addClass(node, clsName) {
        if (node && clsName) {
            var classes = [];
            if (node.className) {
                classes = node.className.split(' ');
            }
            arrayAdd(classes, clsName);
            node.className = classes.join(' ');
        }
    }
    sd.addClass = addClass;

    function removeClass(node, clsName) {
        if (node && clsName) {
            var classes = (node.className || '').split(' ');
            arrayRemove(classes, clsName);
            node.className = classes.join(' ');
        }
    }
    sd.removeClass = removeClass;

    function removeElement(ele) {
        if (ele && ele.parentNode) {
            ele.parentNode.removeChild(ele);
        }
    }
    sd.removeElement = removeElement;

    function isParent(ele, parent) {
        do {
            if (ele == parent) {
                return true;
            }
            ele = ele.parentNode;
        } while(ele.parentNode);
        return false;
    }
    sd.isParent = isParent;

    function findEventSource(evt, clsName) {
        var node = evt.target;
        do {
            var classes = (node.className || '').split(' ');
            if (classes.indexOf(clsName) != -1) {
                return node;
            }
            node = node.parentNode;
        } while(node);
    }
    sd.findEventSource = findEventSource;

    function createDiv(style) {
        var div = document.createElement('div');
        if (style) {
            div.className = style;
        }
        div.onselectstart = function (e) {
            e.preventDefault();
            return false;
        };
        return div;
    }
    sd.createDiv = createDiv;
    function createSpan(style) {
        var div = document.createElement('span');
        if (style) {
            div.className = style;
        }
        return div;
    }
    sd.createSpan = createSpan;

    function clone(src) {
        var ret = {};
        for (var k in src) {
            ret[k] = src[k];
        }
        return ret;
    }
    sd.clone = clone;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (layout) {
        var BorderLayout = (function () {
            function BorderLayout(horizontal) {
                this.isHorizontal = false;
                this.isHorizontal = horizontal;
            }
            BorderLayout.prototype.getBorder = function (c) {
                var types = 'west,north,east,south'.split(',');
                var ret = {};
                types.forEach(function (type) {
                    ret[type] = 0;
                });
                c.children.forEach(function (item) {
                    var size = item.getPreferredSize() || item.size;
                    var index = types.indexOf(item.layout);
                    if (index != -1) {
                        var length = (index % 2 == 0) ? size.width : size.height;
                        ret[item.layout] = length;
                    }
                });
                return ret;
            };

            BorderLayout.prototype.validate = function () {
                var c = this.target;
                var insets = c.insets;
                var children = c.children;
                var width = c.size.width - (insets.left + insets.right);
                var height = c.size.height - (insets.top + insets.bottom);

                var b = this.getBorder(c);
                var centerW = width - b.west - b.east;
                var centerH = height - b.north - b.south;
                var center = null;
                c.children.forEach(function (item) {
                    if (item.layout == 'center') {
                        center = item;
                    }
                });
                if (center) {
                    return (centerW > center.minSize.width && centerH > center.minSize.height);
                }
                return true;
            };

            BorderLayout.prototype.layout = function () {
                var c = this.target;
                var insets = c.insets;
                var children = c.children;
                var width = c.size.width - (insets.left + insets.right);
                var height = c.size.height - (insets.top + insets.bottom);

                var b = this.getBorder(c);
                var centerW = width - b.west - b.east;
                var centerH = height - b.north - b.south;

                if (this.isHorizontal) {
                    c.children.forEach(function (item) {
                        var size = item.getPreferredSize() || item.size;
                        if (item.layout == 'west') {
                            item.setLocation(0, 0);
                            item.setSize(size.width, height);
                        } else if (item.layout == 'north') {
                            item.setLocation(b.west, 0);
                            item.setSize(centerW, size.height);
                        } else if (item.layout == 'east') {
                            item.setLocation(b.west + centerW, 0);
                            item.setSize(size.width, height);
                        } else if (item.layout == 'south') {
                            item.setLocation(b.west, b.north + centerH);
                            item.setSize(centerW, size.height);
                        } else if (item.layout == 'center') {
                            item.setLocation(b.west, b.north);
                            item.setSize(centerW, centerH);
                        }
                    });
                } else {
                    c.children.forEach(function (item) {
                        var size = item.getPreferredSize() || item.size;
                        if (item.layout == 'west') {
                            item.setLocation(0, b.north);
                            item.setSize(size.width, centerH);
                        } else if (item.layout == 'north') {
                            item.setLocation(0, 0);
                            item.setSize(width, size.height);
                        } else if (item.layout == 'east') {
                            item.setLocation(b.west + centerW, b.north);
                            item.setSize(size.width, centerH);
                        } else if (item.layout == 'south') {
                            item.setLocation(0, b.north + centerH);
                            item.setSize(width, size.height);
                        } else if (item.layout == 'center') {
                            item.setLocation(b.west, b.north);
                            item.setSize(centerW, centerH);
                        }
                    });
                }
            };

            BorderLayout.prototype.preferredLayoutSize = function () {
                return this.target.size;
            };
            return BorderLayout;
        })();
        layout.BorderLayout = BorderLayout;
    })(sd.layout || (sd.layout = {}));
    var layout = sd.layout;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (layout) {
        var BoxLayout = (function () {
            function BoxLayout(horizontal) {
                this.isHorizontal = false;
                this.isHorizontal = horizontal;
            }
            BoxLayout.prototype.layout = function () {
                var c = this.target;
                var insets = c.insets;
                var children = c.children;
                var width = c.size.width - (insets.left + insets.right);
                var height = c.size.height - (insets.top + insets.bottom);
                var flexTotal = 0;
                var isHorizontal = this.isHorizontal;
                var space = isHorizontal ? width : height;

                function setLength(item, length) {
                    if (isHorizontal) {
                        item.setSize(length, height);
                    } else {
                        item.setSize(width, length);
                    }
                }

                children.forEach(function (item) {
                    var size = item.getPreferredSize() || item.size;
                    var len = (isHorizontal ? size.width : size.height);
                    setLength(item, len);
                    if (item.layout) {
                        flexTotal += item.layout;
                    } else {
                        space -= len;
                    }
                });
                if (flexTotal > 0) {
                    var fSpace = space / flexTotal;
                    children.forEach(function (item) {
                        if (item.layout) {
                            setLength(item, fSpace * item.layout);
                        }
                    });
                }
                var p = 0;
                children.forEach(function (item) {
                    if (isHorizontal) {
                        item.setLocation(p, 0);
                        p += item.size.width;
                    } else {
                        item.setLocation(0, p);
                        p += item.size.height;
                    }
                });
            };

            BoxLayout.prototype.preferredLayoutSize = function () {
                var parent = this.target;
                var w = 0;
                var h = 0;
                var isHorizontal = this.isHorizontal;
                parent.children.forEach(function (item) {
                    var size = item.getPreferredSize();
                    if (size) {
                        if (isHorizontal) {
                            w += size.width;
                            h = Math.max(h, size.height);
                        } else {
                            w = Math.max(w, size.width);
                            h += size.height;
                        }
                    }
                });
                var insets = parent.insets;
                return new sd.Dimension(w + insets.left + insets.right, h + insets.top + insets.bottom);
            };

            BoxLayout.prototype.validate = function () {
                return true;
            };
            return BoxLayout;
        })();
        layout.BoxLayout = BoxLayout;
    })(sd.layout || (sd.layout = {}));
    var layout = sd.layout;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (layout) {
        var CardLayout = (function () {
            function CardLayout() {
            }
            CardLayout.prototype.layout = function () {
                if (this.target.children.length == 0) {
                    return;
                }
                var c = this.target;
                var insets = c.insets;
                var children = c.children;
                var width = c.size.width - (insets.left + insets.right);
                var height = c.size.height - (insets.top + insets.bottom);
                if (!this.activeChild) {
                    this.activeChild = this.target.children[0];
                }
                this.target.children.forEach(function (item) {
                    item.css('display', 'none').css('position', 'relative');
                });
                this.activeChild.css('display', 'block').setBox(0, 0, width, height);
            };

            CardLayout.prototype.show = function (comp) {
                if (typeof comp == 'number') {
                    comp = this.target.children[comp];
                }
                this.activeChild = comp;
                this.layout();
            };

            CardLayout.prototype.preferredLayoutSize = function () {
                if (!this.activeChild) {
                    this.activeChild = this.target.children[0];
                }
                var parent = this.target;
                var pSize = this.activeChild.getPreferredSize();
                var w = pSize.width;
                var h = pSize.height;
                var insets = parent.insets;
                return new sd.Dimension(w + insets.left + insets.right, h + insets.top + insets.bottom);
            };

            CardLayout.prototype.validate = function () {
                return true;
            };
            return CardLayout;
        })();
        layout.CardLayout = CardLayout;
    })(sd.layout || (sd.layout = {}));
    var layout = sd.layout;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var Button = (function (_super) {
            __extends(Button, _super);
            function Button(btnName, path) {
                _super.call(this, 'button');
                this.name = btnName;
                this.attr('cmd', btnName);
                if (path) {
                    this.iconPath = path;
                }
                this.set(32, 32);
            }
            Button.prototype.init = function () {
                if (this.name) {
                    var img = "url('" + this.iconPath + "/" + this.name.toLowerCase() + ".png')";
                    this.css('backgroundImage', img);
                    this.element.setAttribute('tabindex', '0');
                    this.element.setAttribute('name', name);
                }
            };
            return Button;
        })(sd.Component);
        widget.Button = Button;

        var ButtonGroup = (function () {
            function ButtonGroup(onChange) {
                this.buttons = [];
                this.toggle = true;
                this.single = true;
                var that = this;
                this.handler = function (evt) {
                    var node = (evt.target);
                    while (!node.component && node.parentNode) {
                        node = node.parentNode;
                    }
                    if (node.component) {
                        that.update(node.component);
                    }
                };
                this.onChange = onChange;
            }
            ButtonGroup.prototype.add = function (btn) {
                sd.arrayAdd(this.buttons, btn);
                btn.on('mousedown', this.handler);
            };

            ButtonGroup.prototype.remove = function (btn) {
                sd.arrayRemove(this.buttons, btn);
                btn.off('mousedown', this.handler);
            };

            ButtonGroup.prototype.update = function (from) {
                var selection = this.buttons.filter(function (btn) {
                    return btn.hasClass('ButtonActive');
                });

                var selected = (selection.indexOf(from) != -1);
                if (this.single) {
                    selection.length = 0;
                }
                if (this.toggle && selected) {
                    sd.arrayRemove(selection, from);
                } else {
                    sd.arrayAdd(selection, from);
                }
                this.buttons.forEach(function (btn) {
                    btn.removeClass('ButtonActive');
                });
                selection.forEach(function (btn) {
                    btn.addClass('ButtonActive');
                });
                this.onChange(selection);
            };

            ButtonGroup.prototype.onChange = function (selection) {
            };
            return ButtonGroup;
        })();
        widget.ButtonGroup = ButtonGroup;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var ContextMenu = (function (_super) {
            __extends(ContextMenu, _super);
            function ContextMenu() {
                _super.call(this, sd.createDiv());
                var that = this;
                window.addEventListener('mousedown', function () {
                    setTimeout(function () {
                        that.css('display', 'none');
                    }, 100);
                });
            }
            ContextMenu.prototype.addItem = function (item) {
                var itemDiv = sd.createDiv();
                itemDiv.innerHTML = item;
                this.element.appendChild(itemDiv);
            };

            ContextMenu.get = function (x, y) {
                if (!this.instance) {
                    this.instance = new ContextMenu();
                    this.instance.attach();
                }
                var cm = this.instance;
                cm.clear();
                setTimeout(function () {
                    if (cm.element.childNodes.length) {
                        cm.css('display', 'block');
                        cm.setLocation(x, y);
                    } else {
                        cm.css('display', 'none');
                    }
                }, 1);
                return cm;
            };
            return ContextMenu;
        })(sd.Component);
        widget.ContextMenu = ContextMenu;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var Desktop = (function (_super) {
            __extends(Desktop, _super);
            function Desktop() {
                _super.call(this);
                this.css('opacity', '0');
                this.setLayoutManager(new sd.layout.BorderLayout());
                this.setBorder(0);

                'north,south,west,east,center'.split(',').forEach(function (type) {
                    var panel = new widget.Panel(type);
                    this.add(panel, type);
                    this[type] = panel;
                }, this);

                this.south.setLayoutManager(new sd.layout.BoxLayout(true));

                var insets = this.center.insets.set(0);
                this.west.insets.set(0).right = 3;
                this.east.insets.set(0).left = 3;

                this.south.set(0, 25);
                this.west.set(100);
                this.east.set(100);

                var that = this;

                function onChange() {
                    if (that.layoutManager.validate()) {
                        that.doLayout();
                    } else {
                        return false;
                    }
                }

                widget.Resizer.install(this.west, 'right', onChange);
                widget.Resizer.install(this.east, 'left', onChange);

                var that = this;
                setTimeout(function () {
                    that.restore();
                    that.doLayout();
                }, 10);
                setTimeout(function () {
                    that.css('opacity', '1');
                }, 200);
            }
            return Desktop;
        })(widget.Panel);
        widget.Desktop = Desktop;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var EditBox = (function () {
            function EditBox() {
                this.input = document.createElement('input');
                var that = this;
                var input = this.input;
                function close() {
                    if (!that.callback || !that.input.parentNode) {
                        return;
                    }
                    if (that.callback(that.input.value)) {
                        setTimeout(function () {
                            sd.removeElement(that.input);
                        }, 1);
                    } else {
                        input.focus();
                        input.select();
                    }
                    ;
                }
                input.onblur = close;
                input.onkeyup = function (evt) {
                    var key = evt.key || evt.keyCode || evt.charCode;
                    if (key == 13) {
                        close();
                    }
                };

                window.addEventListener('mousedown', function (evt) {
                    if (evt.target != input) {
                        close();
                    }
                });
            }
            EditBox.prototype.open = function (target, callback) {
                var rect = target.getBoundingClientRect();
                this.input.value = target.innerHTML;
                var s = this.input.style;
                s.position = 'fixed';
                s.left = (rect.left - 2) + 'px';
                s.padding = '2px';
                s.top = (rect.top - 2) + 'px';
                s.width = rect.width + 6 + 'px';
                s.height = rect.height + 4 + 'px';
                s.border = '1px solid gray';
                var input = this.input;
                setTimeout(function () {
                    input.focus();
                    input.select();
                }, 1);
                this.callback = null;
                var that = this;
                setTimeout(function () {
                    that.callback = callback;
                }, 200);

                document.body.appendChild(this.input);
            };
            EditBox.prototype.callback = function (value) {
            };
            return EditBox;
        })();
        widget.EditBox = EditBox;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var Html = (function (_super) {
            __extends(Html, _super);
            function Html(template) {
                if (typeof template === "undefined") { template = ''; }
                _super.call(this);
                this.m = {};
                this.html(template);
            }
            Html.prototype.scheduleUpdate = function () {
                this.schedule(this.update);
            };
            Html.prototype.update = function () {
            };
            Html.prototype.model = function () {
                this.scheduleUpdate();
                return this.m;
            };
            return Html;
        })(sd.Component);
        widget.Html = Html;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var Menu = (function (_super) {
            __extends(Menu, _super);
            function Menu() {
                _super.call(this, sd.createDiv());
                this.items = {};
                this.setPreferredSize(20, 20);
            }
            Menu.prototype.addMenuItem = function (group, items) {
                if (!this.items[group]) {
                    var menuBtn = sd.createDiv('btn');
                    menuBtn.innerHTML = group;
                    var itemGroup = sd.createDiv('items');
                    menuBtn.appendChild(itemGroup);
                    this.element.appendChild(menuBtn);
                    this.items[group] = itemGroup;
                }
                var itemGroup = this.items[group];
                items.forEach(function (item) {
                    var itemDiv = sd.createDiv();
                    itemDiv.innerHTML = item;
                    itemGroup.appendChild(itemDiv);
                });
            };
            return Menu;
        })(sd.Component);
        widget.Menu = Menu;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var Resizer = (function () {
            function Resizer() {
            }
            Resizer.install = function (target, type, onChange) {
                var types = 'left,top,right,bottom'.split(',');
                var start;
                target.addClass('Resizer');

                function onPull(evt) {
                    var box = sd.clone(start);
                    var type = evt.target.className.split(' ');
                    type = type[type.length - 1];
                    if (type.indexOf('left') != -1) {
                        box.x += evt.offsetX;
                        box.w -= evt.offsetX;
                    }
                    if (type.indexOf('right') != -1) {
                        box.w += evt.offsetX;
                    }
                    if (type.indexOf('top') != -1) {
                        box.y += evt.offsetY;
                        box.h -= evt.offsetY;
                    }
                    if (type.indexOf('bottom') != -1) {
                        box.h += evt.offsetY;
                    }
                    if (type == 'head') {
                        box.x += evt.offsetX;
                        box.y += evt.offsetY;
                    }
                    var backup = target.getBox();
                    target.setBox(box);

                    if (onChange && onChange(box) === false) {
                        target.setBox(backup);
                    }
                }

                function onPullStart(evt) {
                    start = {
                        x: target.location.x,
                        y: target.location.y,
                        w: target.size.width,
                        h: target.size.height
                    };
                    var type = evt.target.className.split(' ')[1];
                    target.addClass('resizing');
                    sd.addClass(document.body, 'dragging');
                }

                function onPullEnd() {
                    target.save();
                    target.removeClass('resizing');
                    sd.removeClass(document.body, 'dragging');
                }

                function addHandle(type) {
                    var children = target.element.childNodes;
                    var div = null;
                    for (var i = 0; i < children.length; i++) {
                        var c = children[i];
                        if (sd.hasClass(c, type)) {
                            div = c;
                        }
                    }
                    if (!div) {
                        div = sd.createDiv('handle ' + type);
                        target.element.appendChild(div);
                    }
                    div.addEventListener('pullmove', onPull);
                    div.addEventListener('pullstart', onPullStart);
                    div.addEventListener('pullend', onPullEnd);
                }

                if (type) {
                    addHandle(type);
                } else {
                    addHandle('head');
                    for (var i = 0; i < 4; i++) {
                        addHandle(types[i]);
                    }
                    for (var i = 0; i < 4; i++) {
                        var type = types[i];
                        var next = i + 1;
                        if (next == 4) {
                            next = 0;
                        }
                        addHandle(type + '_' + types[next]);
                    }
                }
            };
            return Resizer;
        })();
        widget.Resizer = Resizer;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var SidePanel = (function (_super) {
            __extends(SidePanel, _super);
            function SidePanel(btnsOnRight) {
                if (typeof btnsOnRight === "undefined") { btnsOnRight = false; }
                var _this = this;
                _super.call(this, new sd.layout.BorderLayout(true));
                this.btnsOnRight = btnsOnRight;
                this.btns = new widget.Panel('btns').setBorder(0);
                this.body = new widget.Panel('body').setBorder(0);
                this.foot = new widget.Panel('foot');
                this.panels = {};
                this.displayIcon = false;
                this.setBorder(1);
                this.add(this.btns, btnsOnRight ? 'east' : 'west');
                this.add(this.body, 'center');
                this.foot.insets.set(0).top = 1;
                this.add(this.foot, 'south');

                this.foot.set(100, 100);
                var that = this;
                widget.Resizer.install(this.foot, 'top', function () {
                    if (that.layoutManager.validate()) {
                        that.doLayout();
                    } else {
                        return false;
                    }
                });
                this.space = new widget.Space();
                this.btns.add(this.space, 1);
                var that = this;

                function btnClick() {
                    that.btnClick();
                }

                this.btnGroup1 = new widget.ButtonGroup(btnClick);
                this.btnGroup2 = new widget.ButtonGroup(btnClick);

                this.btns['onDbtap'] = function (evt) {
                    var closed = true;
                    var items = _this.btns.children;
                    items.forEach(function (btn) {
                        if (btn.hasClass('ButtonActive')) {
                            closed = false;
                        }
                        btn.removeClass('ButtonActive');
                    });
                    if (closed) {
                        ['btnGroup1', 'btnGroup2'].forEach(function (g) {
                            var btns = _this[g].buttons;
                            btns.length && btns[0].addClass('ButtonActive');
                        });
                    }
                    _this.btnClick();
                };
            }
            SidePanel.prototype.save = function () {
                _super.prototype.save.call(this);
                var key = 'SidePanel_' + this.getId();
                localStorage.setItem(key, this.getActive().join(','));
            };

            SidePanel.prototype.restore = function () {
                _super.prototype.restore.call(this);
                var key = 'SidePanel_' + this.getId();
                var ac = localStorage.getItem(key) || '';
                var that = this;
                setTimeout(function () {
                    var activeBtns = ac.split(',');
                    that.btns.children.forEach(function (btn) {
                        if (activeBtns.indexOf(btn.name) != -1) {
                            btn.addClass('ButtonActive');
                        }
                    });
                    that.btnClick();
                }, 1);
            };

            SidePanel.prototype.getActive = function () {
                var activeBtns = [];
                this.btns.children.forEach(function (btn) {
                    if (btn.hasClass('ButtonActive')) {
                        activeBtns.push(btn.name);
                    }
                });
                return activeBtns;
            };

            SidePanel.prototype.btnClick = function () {
                var activeBtns = this.getActive();
                this.body.clear();
                this.foot.clear();

                if (activeBtns.length == 0) {
                    var size = this.btns.getPreferredSize();
                    this.normalWidth = this.size.width;
                    this.setPreferredSize(size.width, size.height);
                    this.forceLayout();
                } else {
                    if (this.size.width < 100) {
                        this.prefSize.width = this.normalWidth || 200;
                        this.forceLayout();
                    }
                }

                if (activeBtns.length > 0) {
                    this.body.add(this.panels[activeBtns[0]], 1);
                }
                if (activeBtns.length > 1) {
                    this.foot.add(this.panels[activeBtns[1]], 1);
                    this.foot.show();
                } else {
                    this.foot.hide();
                }
                this.doLayout();
                this.save();
            };

            SidePanel.prototype.addPanel = function (name, panel, isFoot) {
                this.panels[name] = panel;
                var icon = null;
                if (this.displayIcon) {
                    icon = this.iconPath + '/' + name + '.png';
                }
                var btn = new Tab(name, this.btnsOnRight, icon);
                if (isFoot) {
                    this.btns.add(btn);
                    this.btnGroup2.add(btn);
                } else {
                    this.btns.insertBefore(btn, this.space);
                    this.btnGroup1.add(btn);
                }
            };
            return SidePanel;
        })(widget.Panel);
        widget.SidePanel = SidePanel;

        var Tab = (function (_super) {
            __extends(Tab, _super);
            function Tab(name, btnsOnRight, icon) {
                if (typeof btnsOnRight === "undefined") { btnsOnRight = false; }
                _super.call(this, name);
                this.addClass(btnsOnRight ? 'ButtonRight' : 'ButtonLeft');
                var html = '<div>' + name + '</div>';
                if (icon) {
                    html += '<img src="' + icon + '"/>';
                }
                this.html(html);
                this.set(20, 90);
            }
            return Tab;
        })(widget.Button);
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var Space = (function (_super) {
            __extends(Space, _super);
            function Space() {
                _super.call(this, sd.createDiv());
                this.set(10, 10);
            }
            return Space;
        })(sd.Component);
        widget.Space = Space;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var SplitPanel = (function (_super) {
            __extends(SplitPanel, _super);
            function SplitPanel(isH) {
                if (typeof isH === "undefined") { isH = false; }
                _super.call(this, isH);
                this.isH = isH;
            }
            SplitPanel.prototype.getItems = function () {
                return this.children.filter(function (c) {
                    return c.visiblity && !c.hasClass('splitter');
                });
            };

            SplitPanel.prototype.onAdd = function () {
                this.supressEvent = true;
                var items = this.getItems();
                this.clear();
                for (var i = 0; i < items.length; i++) {
                    this.add(items[i]);
                    if (i < items.length - 1) {
                        this.add(new Splitter(this.isH));
                    }
                }
                this.supressEvent = false;
                this.doLayout();
            };
            return SplitPanel;
        })(widget.Panel);
        widget.SplitPanel = SplitPanel;
        var Splitter = (function (_super) {
            __extends(Splitter, _super);
            function Splitter(isH) {
                _super.call(this, '<div></div>');
                this.isH = isH;
                this.set(2);
                if (isH) {
                    this.addClass('SplitterH');
                }
            }
            Splitter.prototype.onPullstart = function (evt) {
                var items = this.parent.children;
                var index = items.indexOf(this);
                this.before = items[index - 1];
                this.after = items[index + 1];
                this.flex = this.before.layout + this.after.layout;

                var r1 = this.before.element.getBoundingClientRect();
                var r2 = this.after.element.getBoundingClientRect();
                var rect = {
                    top: Math.min(r1.top, r2.top),
                    left: Math.min(r1.left, r2.left),
                    bottom: Math.max(r1.bottom, r2.bottom),
                    right: Math.max(r1.right, r2.right),
                    width: 0,
                    height: 0
                };
                rect.width = rect.right - rect.left;
                rect.height = rect.bottom - rect.top;
                this.rect = rect;
            };
            Splitter.prototype.onPullmove = function (evt) {
                var pc;
                if (this.isH) {
                    pc = (evt.clientX - this.rect.left) / this.rect.width;
                } else {
                    pc = (evt.clientY - this.rect.top) / this.rect.height;
                }
                var min = 0.1;
                pc = sd.range(pc, 0 + min, 1 - min);
                this.before.layout = this.flex * pc;
                this.after.layout = this.flex * (1 - pc);
                this.parent.doLayout();
            };
            Splitter.prototype.onPullEnd = function () {
            };
            return Splitter;
        })(widget.Html);
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var TabPanel = (function (_super) {
            __extends(TabPanel, _super);
            function TabPanel(btnsOnRight) {
                if (typeof btnsOnRight === "undefined") { btnsOnRight = false; }
                _super.call(this);
                this.btnsOnRight = btnsOnRight;
                this.index = 0;
                this.setBorder(0);

                this.body = new widget.Panel(new sd.layout.CardLayout());
                this.body.addClass('body');
                this.body.setBorder(1);

                this.btns = new widget.Panel(true);
                this.btns.addClass('btns');
                this.btns.setBorder(0);

                var head = new widget.Panel(true);
                head.setBorder(0);

                head.addClass('head');
                head.add(this.btns);
                head.add(new widget.Space(), 1);

                this.add(head);
                this.add(this.body, 1);
                var that = this;
                var btns = this.btns;
                (btns).onMousedown = function (e) {
                    var t = e.target;
                    if (sd.hasClass(t, 'Tab')) {
                        var index = btns.children.indexOf(btns.getChild(t));
                        that.select(index);
                    }
                };
            }
            TabPanel.prototype.select = function (index) {
                this.btns.children.forEach(function (btn, i) {
                    btn.removeClass('ButtonActive');
                    if (i == index) {
                        btn.addClass('ButtonActive');
                    }
                });
                this.index = index;
                (this.body.layoutManager).show(index);
                this.btns.doLayout();
            };

            TabPanel.prototype.save = function () {
                _super.prototype.save.call(this);
                var key = 'SplitPanel_' + this.getId();
                localStorage.setItem(key, this.getActive().join(','));
            };

            TabPanel.prototype.restore = function () {
                _super.prototype.restore.call(this);
                var key = 'SplitPanel_' + this.getId();
                var ac = localStorage.getItem(key) || '';
                var that = this;
                setTimeout(function () {
                    var activeBtns = ac.split(',');
                    that.btns.children.forEach(function (btn) {
                        if (activeBtns.indexOf(btn.name) != -1) {
                            btn.addClass('ButtonActive');
                        }
                    });
                    that.btnClick();
                }, 1);
            };

            TabPanel.prototype.getActive = function () {
                var activeBtns = [];
                this.btns.children.forEach(function (btn) {
                    if (btn.hasClass('ButtonActive')) {
                        activeBtns.push(btn.name);
                    }
                });
                return activeBtns;
            };

            TabPanel.prototype.btnClick = function () {
                var activeBtns = this.getActive();
                this.doLayout();
                this.save();
            };

            TabPanel.prototype.addTab = function (name, panel) {
                var btn = new Tab();
                btn.html(name);
                btn.attr('title', name);
                btn.margin = -1;
                btn.element.appendChild(sd.createDiv('closeBtn'));
                this.btns.add(btn);
                this.body.add(panel);
            };

            TabPanel.prototype.init = function () {
                _super.prototype.init.call(this);
                this.select(0);
            };
            return TabPanel;
        })(widget.Panel);
        widget.TabPanel = TabPanel;

        var Tab = (function (_super) {
            __extends(Tab, _super);
            function Tab() {
                _super.call(this, document.createElement('button'));
                this.placeHolder = new widget.Space();
                this.set(100, 24);
            }
            Tab.prototype.setSize = function (w, h) {
                if (isNaN(w) || isNaN(h)) {
                    return this;
                }
                this.size.set(w, h);
                this.cssPx('width', this.size.width + 1);
                this.cssPx('height', this.size.height - 1);
                if (this.hasClass('ButtonActive')) {
                    this.cssPx('height', this.size.height + 2);
                }
                return this;
            };

            Tab.prototype.onPullstart = function (evt) {
                this.placeHolder.set(this.size.width, this.size.height);
                (this.parent).replace(this, this.placeHolder);
                this.parent.element.appendChild(this.element);
            };

            Tab.prototype.onPullmove = function (evt) {
                var changeX = evt.offsetX;
                this.css('margin-left', changeX + 'px');
                var left = this.element.offsetLeft + this.size.width / 2;
                var tabs = (this.parent).children;
                var index = tabs.length - 1;
                for (var i = 0; i < tabs.length; i++) {
                    if (tabs[i].location.x > left) {
                        index = (i - 1);
                        break;
                    }
                }
                (this.parent).setIndex(this.placeHolder, index);
            };

            Tab.prototype.onPullend = function (evt) {
                this.css('margin-left', '0px');
                (this.parent).replace(this.placeHolder, this);
            };
            return Tab;
        })(sd.Component);
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var ToolPanel = (function (_super) {
            __extends(ToolPanel, _super);
            function ToolPanel() {
                _super.call(this, true);
                var that = this;
                this.element.addEventListener('click', function (evt) {
                    that.btnClicked(evt.target);
                });
            }
            ToolPanel.prototype.addButton = function (name, size) {
                if (typeof size === "undefined") { size = 36; }
                var btn = new widget.Button(name);
                btn.set(size, size).setMargin(2);
                btn.attr('title', name);
                this.add(btn);
                return btn;
            };

            ToolPanel.prototype.btnClicked = function (btn) {
                console.log(btn.getAttribute('cmd'));
            };
            return ToolPanel;
        })(widget.Panel);
        widget.ToolPanel = ToolPanel;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        function clearChildren(ele) {
            while (ele.firstChild) {
                ele.removeChild(ele.firstChild);
            }
        }

        var Tree = (function (_super) {
            __extends(Tree, _super);
            function Tree(path) {
                _super.call(this);
                this.editBox = new widget.EditBox();
                if (path) {
                    this.iconPath = path;
                }
                this.set(400, 300);
            }
            Tree.prototype.onMousedown = function (evt) {
                var node = this.findNode(evt);
                var t = evt.target;
                if (evt.button == 0 && ((t.className == "switcher" || t.className == "icon"))) {
                    node.fold = !node.fold;
                } else {
                    this.find(function (node) {
                        node.highlighted = false;
                    });
                    if (node) {
                        node.highlighted = true;
                        this.highlightedNode = node;
                    }
                }
                this.update();
            };

            Tree.prototype.onDbTap = function (evt) {
                if (evt.button == 0) {
                    var node = this.findNode(evt);
                    if (!node) {
                        return;
                    }
                    if (node.children.length && evt.target.tagName != 'LABEL') {
                        node.fold = !node.fold;
                        this.update();
                    } else {
                        this.edit();
                    }
                }
            };

            Tree.prototype.onContextmenu = function (evt) {
                evt.preventDefault();
                var itemId = evt.target.parentNode.getAttribute('itemId') || evt.target.parentNode.parentNode.getAttribute('itemId');
                var items = this.getMenu(itemId);
                var cm = widget.ContextMenu.get(evt.pageX, evt.pageY);
                if (items)
                    items.forEach(function (item) {
                        cm.addItem(item);
                    });
            };

            Tree.prototype.getMenu = function (itemId) {
                return [];
            };

            Tree.prototype.addItem = function (id, label, parent) {
                var item = new Node(id, label);
                if (!parent) {
                    this.root = item;
                } else {
                    var p = this.find(function (item) {
                        return (item.id == parent);
                    });
                    p.children.push(item);
                }
                this.schedule(this.update);
            };

            Tree.prototype.findNode = function (evt) {
                var ele = sd.findEventSource(evt, 'node');
                return this.find(function (node) {
                    return (node.ele == ele);
                });
            };

            Tree.prototype.update = function () {
                clearChildren(this.element);
                if (this.root) {
                    this.element.appendChild(this.root.render());
                }
            };

            Tree.prototype.find = function (test) {
                function walk(item) {
                    if (test(item)) {
                        return item;
                    }
                    for (var i = 0; i < item.children.length; i++) {
                        var ret = walk(item.children[i]);
                        if (ret) {
                            return ret;
                        }
                    }
                    return null;
                }
                if (this.root) {
                    return walk(this.root);
                }
            };

            Tree.prototype.edit = function () {
                var target = this.element.querySelector('.highlighted label');
                if (target) {
                    var t = this.highlightedNode;
                    var that = this;
                    this.editBox.open(target, function (value) {
                        t.label = value;
                        t.render();
                        return true;
                    });
                }
            };
            return Tree;
        })(sd.Component);
        widget.Tree = Tree;

        var Node = (function () {
            function Node(id, label) {
                this.id = id;
                this.label = label;
                this.level = 0;
                this.highlighted = false;
                this.fold = false;
                this.children = [];
            }
            Node.prototype.render = function () {
                if (!this.ele) {
                    this.ele = document.createElement('div');
                    this.ele.className = 'node';
                    this.ele.innerHTML = '<div class="head"><span class="switcher"></span>' + '<span class="icon"></span><label></label></div>' + '<div class="children"></div>';
                }
                var node = this.ele;
                function $(s) {
                    return node.querySelector(s);
                }

                var head = $('.head');
                head.style.paddingLeft = this.level * 10 + 'px';
                $('label').innerHTML = this.label;
                var switcher = $('.switcher');

                var childrenNode = $('.children');
                var level = this.level + 1;

                clearChildren(childrenNode);
                this.children.forEach(function (child) {
                    child.level = level;
                    childrenNode.appendChild(child.render());
                });

                node.setAttribute('itemId', this.id);
                if (this.fold) {
                    sd.addClass(node, 'fold');
                    switcher.innerHTML = '+';
                } else {
                    sd.removeClass(node, 'fold');
                    switcher.innerHTML = '-';
                }
                if (this.children.length == 0) {
                    switcher.innerHTML = '';
                }
                if (this.highlighted) {
                    sd.addClass(node, 'highlighted');
                } else {
                    sd.removeClass(node, 'highlighted');
                }

                return node;
            };
            return Node;
        })();
        widget.Node = Node;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var Window = (function (_super) {
            __extends(Window, _super);
            function Window(draggable) {
                _super.call(this);
                this.add(this.head = new widget.Panel('head').setLayoutManager(new sd.layout.BoxLayout(true)));
                this.add(this.body = new widget.Panel('body'), 1);
                this.add(this.foot = new widget.Panel('foot').setLayoutManager(new sd.layout.BoxLayout(true)));
                this.head.set(0, 24);
                this.foot.set(0, 20);
                if (draggable) {
                    widget.Resizer.install(this);
                }
                var that = this;
                setTimeout(function () {
                    if (!that.location.x) {
                        that.centerInParent();
                    }
                }, 1);
                this.minSize.read('200 150');
                this.setBorder(1);

                this.head.add(new widget.Space().addClass('head'), 1);

                function btn() {
                    var b = new widget.Button();
                    b.setMargin(2);
                    b.set(24, 24);
                    return b;
                }
                this.head.add(btn());
                this.head.add(btn());
                this.head.add(btn());
            }
            Window.prototype.title = function (text) {
                var t = this.$('.head>.Space');
                if (text != undefined) {
                    t.innerHTML = text;
                }
                return t.innerHTML;
            };

            Window.prototype.onResize = function () {
                var headers = this.$('div.head', true);
                if (headers.length == 2) {
                    var w = headers[0].childNodes[0].offsetWidth;
                    headers[1].style.width = w + 'px';
                }
            };

            Window.prototype.save = function () {
                _super.prototype.save.call(this);
                var key = 'loc_' + this.getId();
                localStorage.setItem(key, this.location.toString());
            };

            Window.prototype.restore = function () {
                _super.prototype.restore.call(this);
                if (this.prefSize) {
                    this.set(this.prefSize.width, this.prefSize.height);
                }
                var key = 'loc_' + this.getId();
                var locStr = localStorage.getItem(key);
                if (locStr) {
                    var loc = new sd.Point().read(localStorage.getItem(key));
                    this.setLocation(loc.x, loc.y);
                }
            };

            Window.prototype.onMousedown = function () {
                var p = this.parent;
                var maxIndex = 0;
                var minIndex = 100000;
                p.children.forEach(function (c) {
                    if (c instanceof Window) {
                        var zIndex = parseInt(c.element.style.zIndex || '1000');
                        maxIndex = Math.max(maxIndex, zIndex);
                        minIndex = Math.min(minIndex, zIndex);
                    }
                });
                this.css('zIndex', maxIndex + 1);
                var waste = minIndex - 1000;
                p.children.forEach(function (c) {
                    if (c instanceof Window) {
                        var zIndex = parseInt(c.element.style.zIndex || '1000');
                        c.css('zIndex', zIndex - waste);
                    }
                });
            };
            return Window;
        })(widget.Panel);
        widget.Window = Window;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
var sd;
(function (sd) {
    (function (widget) {
        var WindowDock = (function (_super) {
            __extends(WindowDock, _super);
            function WindowDock() {
                _super.call(this, true);
            }
            WindowDock.prototype.addWindow = function (win) {
                var label = new sd.Component();

                this.add(label);

                return label;
            };
            return WindowDock;
        })(widget.Panel);
        widget.WindowDock = WindowDock;
    })(sd.widget || (sd.widget = {}));
    var widget = sd.widget;
})(sd || (sd = {}));
//# sourceMappingURL=sdesktop.js.map
