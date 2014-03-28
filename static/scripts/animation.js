var module = angular.module ('bnx.simple-life.animation', []).provider ('animation', function animationProvider () {
    var initialized = false;

    function getImage (id) {
        return inventory.images[id];
    }

    function addImages (images) {
        var items = {};

        angular.forEach (images, function (item, id) {
            if (!collie.ImageManager.getImage (item.id || id)) {
                items[item.id || id] = item.source;      
                updateImageInfo (item.id || id, item);
            }
        });

        collie.ImageManager.add(items);
    }

    function updateImageInfo (id, image)
    {
        inventory.images[image.id || id] = image;

        parameters.images.count ++;

        parameters.images.averageHeight = 
            (parameters.images.averageHeight + image.height) / 2;
        parameters.images.averageWidth = 
            (parameters.images.averageWidth + image.width) / 2;
    }

    function drawImage (id, config) {
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

        var image = new collie.DisplayObject(properties).addTo (layer);

        return image;
    }

    this.$get = ['$rootScope', '$q', function ($rootScope, $q) {
        

        $rootScope.$watch (initialized, function () {
            $rootScope.$broadcast ('animation.initialize', initialized);
        });

        function animation (params) {

            function clear ()
            {
                collie.ImageManager.reset ();

                parameters.images.count = 0;
                inventory.images = {};
            }

            function init (params) {
                $.extend (parameters, params);

                clear ();

                layer = new collie.Layer({
                    width: parameters.clientSize.width,
                  height: parameters.clientSize.height
                });

                initialized = true;
            }

            function getImage (id) {
                return inventory.images[id];
            }

            function addImages (images) {
                var items = {};

                angular.forEach (images, function (item, id) {
                    if (!collie.ImageManager.getImage (item.id || id)) {
                        items[item.id || id] = item.source;      
                        updateImageInfo (item.id || id, item);
                    }
                });

                collie.ImageManager.add(items);
            }

            function updateImageInfo (id, image)
            {
                inventory.images[image.id || id] = image;

                parameters.images.count ++;

                parameters.images.averageHeight = 
                    (parameters.images.averageHeight + image.height) / 2;
                parameters.images.averageWidth = 
                    (parameters.images.averageWidth + image.width) / 2;
            }

            function drawImage (id, config) {
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

                var image = new collie.DisplayObject(properties).addTo (layer);

                return image;
            }

            var parameters = {
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

                animationQ: []
            }

            var inventory = {
                images: {},
            };

            var layer;

            init (params);

            this.init = init;
            this.addImages = addImages,
            this.getImage = getImage,
            this.getImages = function () {return inventory;},
            this.getImagesInfo = function () {return parameters.images;},
            this.getParameters = function () {return parameters;},

            this.setAnimationSpeed = function (speed) { parameters.animation.currentSpeed = speed; },

            this.drawImage = drawImage,
            this.pause = function () {
                angular.forEach (parameters.animationQ, function (item) {item.pause (); });
                $rootScope.$broadcast ('bnx.sl.animation.pause', this);
            },

            this.continue = function () {
                angular.forEach (parameters.animationQ, function (item) {item.start (); });
                $rootScope.$broadcast ('bnx.sl.animation.continue', this);
            }

            this.getLayer = function () { return layer; }
        }

        return {
            new: function (params) {
                return new animation (params);
            }
        }
    }];
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
        var clientSize = parameters.clientSize;
        var itemAnimations = [];

        element.bind ('mousemove touchmove',  function (event) {
            $rootScope.$broadcast ('bnx.sl.canvas.move', event);
        });

        ngModel.$render = function () {

            if (!ngModel.$viewValue)
                return;
    
            $rootScope.$broadcast ('bnx.sl.animation.loaded');

            var itemSize = {
                width: 100,
                height: 100
            };

            var pictures = {};
            var picture_repository = {}
            var avgHeight = clientSize.height;
            var avgWidth = clientSize.width;
            var ratio = 1;

            var items = [];
            var itemCount = 0;

            scope.animation.addImages (ngModel.$modelValue);

            angular.forEach (ngModel.$modelValue, function (photo, id) {
                pictures[photo.id || id] = photo.source;
                picture_repository[photo.id || id] = {
                    'source': photo.source,
                    'width': photo.width,
                    'height': photo.height
                };
            });

            var imagesInfo = scope.animation.getImagesInfo ();
            var layer = scope.animation.getLayer ();

            angular.forEach (pictures, function (link, id) {
                var item = scope.animation.drawImage (id, {
                    x: clientSize.width / 2,
                    y: clientSize.height / 2,
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

                items.push(item);
            });

            var layoutFunctions = [scrollHorizontal];
            var layoutSelectedIndex = -1;

            $.extend (parameters, {
                picture_repository: picture_repository,
                items: items,
                itemsCount: items.length,
                clientSize: clientSize,
                scale: ratio,
                rows: 3,
            });
                
            var control = collie.Timer.repeat(function(oEvent){
                layoutSelectedIndex = (++layoutSelectedIndex) % layoutFunctions.length;
                arrangeItems.apply (arrangeItems, layoutFunctions[layoutSelectedIndex](scope.animation));
            });

            itemCount = items.length;


            function arrangeItems(getTransitionInfo, updateRepeatInfo){
                var parameters = scope.animation.getParameters ();
                var centerX = clientSize.width / 2;
                var centerY = clientSize.height / 2;
                var from, to;
                var aFrom, aTo, set, effects;
                var scaleFrom, scaleTo;
                var item;

                while (parameters.animationQ.length)
                    parameters.animationQ.pop().stop();

                for (var i = 0; i < itemCount; i++){
                    var item = items[i];

                    from = item.get();
                    to = getTransitionInfo(i, item);
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
                    }) (i, to, item);

                    parameters.animationQ.push(
                        collie.Timer.queue().
                        delay(function(){}, i * 8).
                        transition(item, 600, {
                            from:aFrom,
                            to:aTo,
                            set:set,
                            effect: effects
                        }).
                        repeat(repeat, 5)
                    );

                }
            }

            collie.Renderer.addLayer(layer);
            collie.Renderer.load(element[0]);
            collie.Renderer.start();

            scope.$on('$destroy', function() {
                control.stop ();
                while (itemAnimations.length)
                    itemAnimations.pop().stop();

                layer.clear ();
                console.debug ('destroy has been called');

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

