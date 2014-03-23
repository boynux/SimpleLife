var module = angular.module ('animation', []).provider ('animation', function animationProvider () {
    var initialized = false;

    function clear ()
    {
        collie.ImageManager.reset ();

        parameters.images.count = 0;
        inventory.images = {};
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

    this.$get = ['$rootScope', '$q', function ($rootScope, $q) {
        var parameters = {
            clientSize: {
                width: document.body.clientHeight,
                height: document.body.clientWidth
            },

            animation: {
                maxSpeed: 6,
                currentSpeed: 4  
            },

            images: {
                count: 0,
                averageWidth: 0,
                averageHeight: 0,
            }
        }

        var inventory = {
            images: {},
        };

        var layer;

        $rootScope.$watch (initialized, function () {
            $rootScope.$broadcast ('animation.initialize', initialized);
        });

        var init = function (params) {
            $.extend (parameters, params);

            clear ();

            layer = new collie.Layer({
                width: parameters.clientSize.width,
                height: parameters.clientSize.height
            });

            initialized = true;
        }

        return {
            init: init,
            addImages: addImages,
            getImage: getImage,
            getImagesInfo: function () {return parameters.images;},
            getParameters: function () {return parameters;},

            setAnimationSpeed: function (speed) { parameters.animation.currentSpeed = speed; },

            drawImage: drawImage,

            getLayer: function () { return layer; }
        }
    }];
});

module.service ('animationService', function ($rootScope, $q) {
    var parameters = {
        clientSize: {
            width: document.body.clientHeight,
            height: document.body.clientWidth
        },

        animation: {
            maxSpeed: 6,
            currentSpeed: 1 
        },

        images: {
            count: 0,
            averageWidth: 0,
            averageHeight: 0,
        }
    }
    
    var layer;
    var inventory = {
        images: {},
    };

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

    return {
        init: init,
        addImages: addImages,
        getImage: getImage,
        getImagesInfo: function () {return parameters.images;},
        getParameters: function () {return parameters;},

        setAnimationSpeed: function (speed) { parameters.animation.currentSpeed = speed; },
        
        drawImage: drawImage,

        getLayer: function () { return layer; }
    }
});

module.directive('animationAlbumShow', function (animationService) {
    function link (scope, element, attrs, ngModel) {
        animationService.init ({
            clientSize: {
                width : element.offsetParent ().width (),
                height : document.body.clientHeight - 100
            }
        });

        var parameters = {
        };

        var clientSize = {
            width : element.offsetParent ().width (),
            height : document.body.clientHeight - 100
        };

        console.debug (clientSize);

        var itemColors = ['#74ff00', '#88ff00', '#9dff00', '#b2ff00', '#c7ff00', '#b2ff00', '#9dff00', '#88ff00'];
        var itemAnimations = [];

        element.bind ('mousemove touchmove',  function (event) {
            var parameters = animationService.getParameters ();
            var offset = $(this).offset ();
            var mousePosition = {
                x: event.pageX - offset.left,
                y: event.pageY - offset.top
            };

            parameters.mouseMove = true;

            if (event.type == 'touchmove') {
                mousePosition.x = event.originalEvent.touches[0].pageX - offset.left;
                mousePosition.y = event.originalEvent.touches[0].pageX - offset.top;
            }

            animationService.setAnimationSpeed (
                Math.ceil (
                    parameters.animation.maxSpeed * 
                    (mousePosition.x / parameters.clientSize.width - 0.5)
                )
            );

            /*
            if (parameters.selectedItem) {
                parameters.selectedItem.move (mousePosition.x, mousePosition.y);
                parameters.selectedItem.set ('zIndex', 1000);
            }
            */

            event.stopPropagation(); 
            event.preventDefault();
        });

        ngModel.$render = function () {

            if (!ngModel.$viewValue)
                return;

            console.debug('sl-album-show loaded', ngModel.$viewValue, element);

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

            animationService.addImages (ngModel.$modelValue);

            angular.forEach (ngModel.$modelValue, function (photo, id) {
                pictures[photo.id || id] = photo.source;
                picture_repository[photo.id || id] = {
                    'source': photo.source,
                    'width': photo.width,
                    'height': photo.height
                };
            });

            var imagesInfo = animationService.getImagesInfo ();
            var layer = animationService.getLayer ();

            angular.forEach (pictures, function (link, id) {
                var item = animationService.drawImage (id, {
                    x: clientSize.width / 2,
                    y: clientSize.height / 2,
                }).attach ({
                    mousedown: function (event) {
                        var parameters = animationService.getParameters ();
                        
                        if (parameters.selectedItem) {
                            parameters.selectedItem = null;
                        } else {
                            parameters.selectedItem = event.displayObject;
                        }

                        parameters.mouseMove = false;
                    },
                        
                    mousemove: function (event) {
                        console.debug (event);
                    },

                    mouseup: function (event) {
                        var parameters = animationService.getParameters ();

                        if (!parameters.mouseMove && parameters.selectedItem) {
                            var imageInfo = animationService.getImage (parameters.selectedItem.get ('name'));

                            var to = [
                                imageInfo.width,
                                imageInfo.height,
                                (parameters.clientSize.width - imageInfo.width) / 2,
                                (parameters.clientSize.height  - imageInfo.height) / 2,
                                1000
                            ];

                            var set = [
                                'width', 
                                'height', 
                                'x', 
                                'y', 
                                'zIndex'
                            ];

                            var effects = [
                                collie.Effect.easeOutSine,
                                collie.Effect.easeOutSine,
                                collie.Effect.easeOutSine,
                                collie.Effect.easeOutSine,
                                collie.Effect.easeOutSine,
                            ];

                            collie.Timer.
                            transition(item, 600, {
                                to:to,
                                set:set,
                                effect: effects
                            });
                        } else {
                            parameters.selectedItem = null;
                        }

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
                arrangeItems.apply (arrangeItems, layoutFunctions[layoutSelectedIndex](animationService));
            });

            itemCount = items.length;

            function explodeImages (params) {
                var countX = Math.ceil (Math.sqrt(params.itemsCount));
                var countY = Math.ceil (params.itemsCount / countX);

                var offsetX = - params.clientSize.width / 2;
                var offsetY = - params.clientSize.height / 2;

                var fill = {
                    x: params.clientSize.width / countX,
                    y: params.clientSize.height / countY
                };

                return [function(i, item) {
                    var fill = {
                        x: params.clientSize.width / countX,
                        y: params.clientSize.height / countY
                    };

                    var itemProperties = params.picture_repository[item.get ('name')];

                    return {
                        // x: -item.get('width') / 2, 
                        // y: -item.get('height') / 2,
                        x: offsetX + (i % countX) * fill.x + Math.floor ((fill.x - item.get('width')) / 2),
                        y: offsetY + (Math.floor (i / countX) % countY) * fill.y, // + Math.floor ((fill.y - item.get ('height')) / 2),

                        width: Math.floor (itemProperties.width * params.scale / countX),
                        height: Math.floor (itemProperties.height * params.scale / countX)
                    }
                }, function(frame, i, to, item) {
                    // to.x = offsetX + (i % countX) * fill.x + Math.floor ((fill.x - item.get('width')) / 2); // Math.random ());
                    // to.y = offsetY + (Math.floor (i / countX) % countY) * fill.y; //  + Math.floor (fill.y - item.get ('height')) / 2; // * Math.random ()),
                }];
            }

            function layoutHorizontal(){
                var offsetX = - (itemCount / 2) * itemSize;
                var offsetY = - itemSize / 2;

                arrangeItems(function(i){
                    return {
                        x: offsetX + i*itemSize,
                        y: offsetY,
                        width: itemSize,
                        height: itemSize,
                        angle: 0,
                        originX: "center",
                        originY: "center"
                    }
                }, function(frame, idx, info){
                    if (info.width > 0.4){
                        info.width *= 0.99;
                        info.height *= 0.99;
                    }
                });
            }

            function layoutRectangle() {
                var countX = Math.ceil(Math.sqrt(itemCount));
                var countY = Math.ceil(itemCount/countX);
                var offsetX = - (countX/2)*itemSize;
                var offsetY = - (countY/2)*itemSize;

                arrangeItems(function(i){
                    return {
                        x: offsetX + (i%countX)*itemSize,
                    y: offsetY + parseInt(i/countX)*itemSize,
                    width: itemSize,
                    height: itemSize,
                    angle: 0,
                    originX: "left",
                    originY: "top",
                    }
                }, function(frame, idx, info){
                    // info.backgroundColor = itemColors[(frame+idx)%itemColors.length];
                })
            }

            function layoutCircle(){
                var radius = itemSize * 2;
                var degStart = 90;
                var degUnit = Math.round(360 / itemCount);

                arrangeItems(function(i){
                    var deg = degStart - degUnit * i;
                    var rad = collie.util.toRad(deg);

                    return {
                        x: radius * Math.cos(rad),
                        y: radius * Math.sin(rad),
                        width: itemSize,
                        height: itemSize,
                        angle: deg,
                        originX: "left",
                        originY: "top"
                    }
                }, function(frame, idx, info){
                    info.angle++;
                });
            }

            function arrangeItems(getTransitionInfo, updateRepeatInfo){
                var centerX = clientSize.width / 2;
                var centerY = clientSize.height / 2;
                var from, to;
                var aFrom, aTo, set, effects;
                var scaleFrom, scaleTo;
                var item;

                while (itemAnimations.length)
                    itemAnimations.pop().stop();

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
                        var parameters = animationService.getParameters ();
                        var _params = {i:i, to:to, item:item};
                        return function (animationParams) {
                            if (item != parameters.selectedItem) {
                                updateRepeatInfo(animationParams.frame, _params.i, _params.to, _params.item);
                                _params.item.set(_params.to);
                            }
                        }
                    }) (i, to, item);

                    itemAnimations.push(
                        collie.Timer.queue().
                        delay(function(){}, i * 8).
                        /*
                        transition (item, 600, {
                            from: [scaleFrom, scaleFrom],
                            to: [scaleTo, scaleTo],
                            set: ['scaleX', 'scaleY']
                        }).
                        */
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
            });
        };

    }

    return {
        require: 'ngModel',
        restrict:'AE',
        link: link
    }
});

