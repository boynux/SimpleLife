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

        this.displayObject = [],
        this.animationQ = []
        this.inventory = {
            images: {},
        };

        $.extend (this.parameters, params);
        $log.debug ("initializing new Animation object", this.parameters);

        this.layer = new collie.Layer({
            width: this.parameters.clientSize.width,
            height: this.parameters.clientSize.height
        });

        this.initialized = true;
    };

    Animation.prototype = {

        clear: function ()
        {
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

            var image = new collie.DisplayObject(properties).addTo (this.layer);

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

        start: function (element) {
            this.element = element;

            collie.Renderer.addLayer(this.layer);
            collie.Renderer.load(element);
            collie.Renderer.start();
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

module.directive('animationAlbumShow', function ($rootScope, animation) {
    function link (scope, element, attrs, ngModel) {
        scope.animation = animation.new ({
            clientSize: {
                width : element.offsetParent ().width (),
                height : document.body.clientHeight - 100
            }
        });

        var parameters = scope.animation.getParameters ();

        element.bind ('mousemove touchmove',  function (event) {
            $rootScope.$broadcast ('bnx.sl.canvas.move', event);
        });

        ngModel.$render = function () {

            if (!ngModel.$viewValue)
                return;
    
            $rootScope.$broadcast ('bnx.sl.animation.loaded');

            scope.animation.addImages (ngModel.$modelValue);

            angular.forEach (scope.animation.getImages (), function (link, id) {
                var item = scope.animation.drawImage (id, {
                    x: parameters.clientSize.width / 2,
                    y: parameters.clientSize.height / 2,
                }).attach ({
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
            });

            var layoutFunctions = [scrollHorizontal];
            var layoutSelectedIndex = -1;

            var control = collie.Timer.repeat(function(oEvent){
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
                        repeat(repeat, 5)
                    );

                });
            }

            scope.animation.start (element[0]);
            scope.$on('$destroy', function() {
                console.debug ('destroy has been called');

                control.stop ();
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

