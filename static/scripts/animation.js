var module = angular.module ('bnx.simple-life.animation', []).
factory ('animation', function ($rootScope, $q, $log) {
    function Animation (params) {
        this.parameters = {
            clientSize: {
                width: document.body.clientHeight,
                height: document.body.clientWidth
            },

            animation: {
                maxSpeed: 6,
                currentSpeed: 2
            },

            images: {
                count: 0,
                averageWidth: 0,
                averageHeight: 0,
            },
        }

        this.controls = [],
        this.displayObject = [],
        this.animationQ = []
        this.inventory = {
            images: {},
        };

        $.extend (this.parameters, params);
        $log.debug ("initializing new Animation object", this.parameters);

        this.layer = new collie.Layer({
            width: this.parameters.clientSize.width,
            height: this.parameters.clientSize.height,
        });

        this.initialized = true;
    };

    Animation.prototype = {

        clear: function ()
        {
            $log.debug ('clear called, removing objects ...');
            angular.forEach (this.getDisplayObjects (), function (item) {
                item.detach ('click');
                item.detach ('mouseup');
                item.detach ('mousedown');
            });

            collie.ImageManager.reset ();

            this.parameters.images.count = 0;
            this.inventory.images = {};
            this.layer.clear ();
        },

        getImage:function  (id) {
            return this.inventory.images[id];
        },

        updateImageInfo: function (id, image)
        {
            console.debug (id, image);
            this.inventory.images[id] = image;
            this.parameters.images.count ++;

            this.parameters.images.averageHeight = 
                (this.parameters.images.averageHeight + image.height) / 2;
            this.parameters.images.averageWidth = 
                (this.parameters.images.averageWidth + image.width) / 2;
        },

        addImage: function (item, updateInfo) {
            var itemId = item.id;
            var items = [];

            if (!collie.ImageManager.getImage (itemId)) {
                items[itemId] = item.source;      
            }

            updateInfo && this.updateImageInfo (itemId, item);

            var defer = $q.defer ();

            collie.ImageManager.add(items, function () {
                defer.resolve (true);
            });

            return defer.promise;
        },

        addImages: function (images) {
            var items = {};

            console.debug ('this is:', this);
            angular.forEach (images, function (item, id) {
                var itemId = item.id || id;

                if (!collie.ImageManager.getImage (itemId)) {
                    items[itemId] = item.source;      
                }

                this.updateImageInfo (itemId, item);
            }.bind (this));

            var defer = $q.defer ();

            collie.ImageManager.add(items, function () {
                defer.resolve (true);
            });

            return defer.promise;
        },

        drawImage: function (id, config) {
            var properties = {
                name: id,
                originX: 'left',
                originY: 'top',

                backgroundImage: id,
                fitImage: true
            };

            if (config) {
                $.extend (properties, config);
            }

            var image = new collie.FramedImage (properties).addTo (this.layer);
            image.attach ({
                click: function (event) {
                    $rootScope.$broadcast ('bnx.sl.item.click', event);
                },

                mousedown: function (event) {
                    $rootScope.$broadcast ('bnx.sl.item.mousedown', event);
                },

                mouseup: function (event) {
                    $rootScope.$broadcast ('bnx.sl.item.mouseup', event);
                }
            });

            this.displayObject.push (image);

            return image;
        },

        getImages: function () {return this.inventory.images;},
        getDisplayObject: function (id) {return this.displayObject [id]; },
        getDisplayObjects: function () {return this.displayObject; },
        getImagesInfo: function () {return this.parameters.images;},
        getParameters: function () {return this.parameters;},
        setAnimationSpeed: function (speed) { this.parameters.animation.currentSpeed = speed; },
        getLayer: function () { return this.layer; },

        transition: function (object, to, effect) {
            fromArray = [];
            toArray = [];
            setArray = [];
            effectArray = [];

            for (var key in to){
                toArray.push(to[key]);
                setArray.push(key);
                effectArray.push(effect || collie.Effect.easeOutSine);
            }

            var defer = $q.defer ();

            collie.Timer.transition(object, 400, {
                to:toArray,
                set:setArray,
                effect: effectArray
            }).attach ({
                'complete': function  () {
                    defer.resolve (true);
                }
            });

            return defer.promise;
        },

        repeat: function (callback) {
            return this.controls.push (collie.Timer.repeat (callback));
        },

        start: function (element) {
            this.element = element;

            $(element).bind ('mousemove touchmove',  function (event) {
                $rootScope.$broadcast ('bnx.sl.canvas.move', event);
            });

            collie.Renderer.addLayer(this.layer);
            collie.Renderer.load(element);
            collie.Renderer.start("30fps");
        },

        pause: function () {
            angular.forEach (this.animationQ, function (item) {item.pause (); });
            $rootScope.$broadcast ('bnx.sl.animation.pause', this);
        },

        continue: function () {
            angular.forEach (this.animationQ, function (item) {item.start (); });
            $rootScope.$broadcast ('bnx.sl.animation.continue', this);
        },

        stop: function () {
            while (this.controls.length)
                this.controls.pop ().stop ();

            while (this.animationQ.length)
                this.animationQ.pop().stop();
        }
    };

    return {
        new: function (params) {
            return new Animation (params);
        }
    }
});

module.directive('animationAlbumShow', function ($rootScope, animation, $log) {
    function link (scope, element, attrs, ngModel) {
        $log.debug ("Loading new animation ...");

        scope.animation = animation.new ({
            clientSize: {
                width : element.offsetParent ().width (),
                height : document.body.clientHeight - 100,
            }
        });

        var parameters = scope.animation.getParameters ();

        ngModel.$render = function () {

            if (!ngModel.$viewValue)
                return;
    
            $rootScope.$broadcast ('bnx.sl.animation.loaded');

            scope.animation.addImage ({
                id: 'background',
                source: '/static/images/background-2.jpg'
            });

            scope.animation.drawImage ('background', {
                x: 0,
                y: 0,
                zIndex: -1,
                fitImage: false,
            });

            scope.animation.addImages (ngModel.$modelValue);

            angular.forEach (scope.animation.getImages (), function (link, id) {
                var item = scope.animation.drawImage (id, {
                    x: parameters.clientSize.width / 2,
                    y: parameters.clientSize.height / 2,

                    radius: 8,
                    strokeWidth: 4,
                    strokeColor: "#fff"
                });
            });

            var layoutFunctions = [scrollHorizontal];
            var layoutSelectedIndex = -1;

            var control = scope.animation.repeat(function(oEvent){
                layoutSelectedIndex = (++layoutSelectedIndex) % layoutFunctions.length;
                arrangeItems.apply (arrangeItems, layoutFunctions[layoutSelectedIndex](scope.animation));
            });

            function arrangeItems(getTransitionInfo, updateRepeatInfo){
                var parameters = scope.animation.getParameters ();
                var centerX = parameters.clientSize.width / 2;
                var centerY = parameters.clientSize.height / 2;
                var from, to;
                var aFrom, aTo, set, effects;
                var scaleFrom, scaleTo;

                scope.animation.stop ();
                
                angular.forEach (scope.animation.getDisplayObjects (), function (item, index) {
                    from = item.get();

                    if (from.name == 'background')
                        return;

                    to = getTransitionInfo(index, item);
                    aFrom = [];
                    aTo = [];
                    set = [];
                    effects = [];

                    scaleFrom = [];
                    scaleTo = [];

                    if (typeof to.x != 'undefined') to.x += centerX;
                    if (typeof to.y != 'undefined') to.y += centerY;

                    for (var key in to){
                        if (key == "originX" || key == "originY") {
                            continue;
                        }

                        from[key] = Math.round(from[key]);
                        aFrom.push(from[key]);
                        aTo.push(to[key]);
                        set.push(key);
                        effects.push(collie.Effect.easeOutSine);
                    }

                    var repeat = (function(i, to, item) {
                        var _params = {i:i, to:to, item:item};
                        return function (animationParams) {
                            if (item != parameters.selectedItem) {
                                updateRepeatInfo(animationParams.frame, _params.i, _params.to, _params.item);
                                _params.item.set(_params.to);
                            }
                        }
                    }) (index, to, item);

                    scope.animation.animationQ.push(
                        collie.Timer.queue().
                        delay(function(){}, index * 8).
                        transition(item, 600, {
                            from:aFrom,
                            to:aTo,
                            set:set,
                            effect: effects
                        }).
                        repeat(repeat, 16)
                    );

                });
            }

            scope.animation.start (element[0]);

            scope.$on('$destroy', function() {
                console.debug ('destroy has been called');

                scope.animation.stop ();
                scope.animation.clear ();

                delete scope.animation;
            });
        };
    }

    return {
        require: 'ngModel',
        restrict:'AE',
        link: link
    }
});

collie.FramedImage = collie.Class({
    $init : function (htOption) {
        this.option({
            radius : 0,
            strokeColor : '',
            strokeWidth : 0,
            fillColor : '',
        }, null, true);

        this._sBorderRadius = collie.util.getCSSPrefix("border-radius", true);
    },

    onCanvasDraw : function (oEvent) {
        var oContext = oEvent.context;
        var nRadius = this._htOption.radius;
        var bIsRetinaDisplay = collie.Renderer.isRetinaDisplay();
        var nWidth = this._htOption.width;
        var nHeight = this._htOption.height;
        var nStrokeWidth = this._htOption.strokeWidth;

        if (this._htOption.strokeColor) {
            oContext.strokeStyle = this._htOption.strokeColor;
        }

        if (this._htOption.strokeWidth) {
            oContext.lineWidth = nStrokeWidth;
        }

        if (nRadius) {
            oContext.save();
            oContext.translate(oEvent.x, oEvent.y);
            oContext.beginPath();
            oContext.moveTo(nRadius, 0);
            oContext.lineTo(nWidth - nRadius, 0);
            oContext.quadraticCurveTo(nWidth, 0, nWidth, nRadius);
            oContext.lineTo(nWidth, nHeight - nRadius);
            oContext.quadraticCurveTo(nWidth, nHeight, nWidth - nRadius, nHeight);
            oContext.lineTo(nRadius, nHeight);
            oContext.quadraticCurveTo(0, nHeight, 0, nHeight - nRadius);
            oContext.lineTo(0, nRadius);
            oContext.quadraticCurveTo(0, 0, nRadius, 0);
            oContext.closePath();
            oContext.restore();

            if (this._htOption.fillColor || this._htOption.fillImage) {
                oContext.fill();
            }    

            if (this._htOption.strokeWidth) {
                oContext.stroke();
            }
        } else {
            if (this._htOption.fillColor || this._htOption.fillImage) {
                oContext.fillRect(oEvent.x, oEvent.y, nWidth, nHeight);
            }

            if (this._htOption.strokeWidth) {
                oContext.strokeRect(oEvent.x, oEvent.y, nWidth, nHeight);
            }
        }

        this._bChanged = false;
    }
}, collie.DisplayObject);
