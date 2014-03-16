'use strict'

var simpleLifeApp = angular.module ('simpleLifeApp', [
    'ngRoute',
    'ngResource',
    'simpleLifeControllers',
    'facebook'
]).config (['$routeProvider', 'facebookProvider',
    function ($routeProvider, facebookProvider) {
        facebookProvider.init ();
        $routeProvider.
            when ('/', {
                templateUrl: 'partials/index.html',
                controller: 'IndexCtrl'
            }).
            when ('/signin', {
                templateUrl: 'partials/signin.html',
                controller: 'SigninCtrl'
            }).
            when ('/albums', {
                templateUrl: 'partials/albums.html',
                controller: 'AlbumsCtrl',
            }).
            when ('/:albumId/pictures', {
                templateUrl: 'partials/confirm.html',
                controller: 'ConfirmCtrl',
            }).
            when ('/signout', {
                templateUrl: 'partials/signout.html',
                controller: 'SignOutCtrl'
            }).
            when ('/confirm', {
                templateUrl: 'partials/confirm.html',
                controller: 'ConfirmCtrl'
            }).
            otherwise ({
                redirectTo: '/'
            });
        }
    ]);

simpleLifeApp.factory ('RenewToken', function () {
    return {script: ''};
});

simpleLifeApp.directive('fbSignin', function () {
    return {
        restrict:'E',
        template: '<div class="fb-like" data-href="{{page}}" data-colorscheme="light" data-layout="box_count" data-action="like" data-show-faces="true" data-send="false"></div>'
    }
});

simpleLifeApp.directive('fbImage', function ($parse, facebook) {
    function link (scope, element, attrs) {
        scope.label = attrs.label;
        scope.model = attrs

        facebook.api (attrs.reference).then (function (result) {
            console.log (element);
            scope.info = result;
        });
    }

    return {
        transclude: true,
        restrict:'E',
        templateUrl: 'partials/album-select.html',
        link: link
    }
});

simpleLifeApp.run (['$rootScope', '$http', 'facebook', '$location',
    function ($rootScope, $http, facebook, $location) {
        $rootScope.$location = $location;
        $rootScope.user = false;
        $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
            if (response.status == 'connected') {
                facebook.connected = true;

                $http.get ('signin').success (function (response) {
                    console.log (response)
                }); 

                facebook.api ('me').then (function (result) {
                    console.log (result)
                    $rootScope.user = result;
                });
            } else {
                facebook.connected = false;
                $rootScope.user = false;

                $http.get ('signout').success (function (response) {
                    console.log (response)
                }); 
            }
        });
    }
]);

simpleLifeApp.service ('facebookService', function (facebook, $rootScope, $q) {
    var albums = [];
    var selectedAlbums = [];
    var selectedPhotos = [];

    var promiseWhenConnectedApi = function (callback) {
        if (facebook.connected) {
            var promise = callback ();
        } else {
            var defer = $q.defer ();

            $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
                if (response.status === 'connected') {
                    defer.resolve (callback ());
                }
            });

            var promise = defer.promise;
        }

        return promise;
    }

    return {
        getAlbums: function () {
            var promise =
                promiseWhenConnectedApi (function () {
                    return facebook.api ('me/albums');
                });

            /*
            if (facebook.connected) {
                return facebook.api ('me/albums');
            } else {
                var defer = $q.defer ();

                $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
                    if (response.status === 'connected') {
                        defer.resolve (facebook.api ('me/albums'));
                    }
                });

                return defer.promise;
            }
            */
            return promise;
        },
        
        getAlbumPhotos: function (album_id) {
            return promiseWhenConnectedApi (function () {
                return facebook.api ('me/' + album_id + '/photos?fields=picture')
            });

            if (facebook.connected) {
                var promise = facebook.api ('me/album_id/photos').then (function (result) {
                    console.log (result);
                });
            } else {
                $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
                    if (response.status === 'connected') {
                        var promise = facebook.api ('me/albums').then (function (result) {
                            console.log (result);
                        });
                    }
                });
            }

            return promise;
        },

        selectedAlbum: function (album, selected) {
            if (selected) {
                if (selectedAlbums.indexOf (album) < 0)
                    selectedAlbums.push (album);
            } else {
                var index = selectedAlbums.indexOf (album);

                if (index > -1) {
                    selectedAlbums.splice (index, 1)
                }
            }
        },
        
        getSelectedAlbums: function () {
            return selectedAlbums;
        },

        albums: function () {
            return albums;
        }
    };
});

simpleLifeApp.factory ('Album', function ($resource) {
    return $resource ('albums/:id', {albumId: '@id'});
});

simpleLifeApp.directive('slAlbumShow', function ($parse, facebook) {
    function link (scope, element, attrs, ngModel) {
        var parameters = {
            speed: 6,
            currentSpeed: 4
        };

        var clientSize = {
            width : element.offsetParent ().width (),
            height : document.body.clientHeight - 100
        };

        console.debug (clientSize);
        var itemColors = ['#74ff00', '#88ff00', '#9dff00', '#b2ff00', '#c7ff00', '#b2ff00', '#9dff00', '#88ff00'];
        var itemAnimations = [];

        element.bind ('mousemove touchmove',  function (event) {
            var offset = $(this).offset ();

            parameters.currentSpeed = 
                Math.ceil (parameters.speed * ((event.pageX - offset.left) / clientSize.width - 0.5));

            console.debug (parameters);

            if (parameters.selectedItem) {
                parameters.selectedItem.set ({
                    x: event.pageX - offset.left,
                    y: event.pageY - offset.top
                });
            }

            event.stopPropagation(); 
            event.preventDefault();
        });

        ngModel.$render = function () {

            if (!ngModel.$viewValue)
                return;

            console.debug('sl-album-show loaded', ngModel.$viewValue, element);
            console.log (element.width ());

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

            angular.forEach (ngModel.$modelValue, function (photo, id) {
                console.debug (photo);
                pictures[photo.id || id] = photo.source;
                picture_repository[photo.id || id] = {
                    'source': photo.source,
                    'width': photo.width,
                    'height': photo.height
                };

                avgHeight = (photo.height + avgHeight) / 2;
                avgWidth = (photo.width + avgWidth) / 2;
            });

            ratio = Math.min (clientSize.height / avgHeight) / Math.max(clientSize.height / avgHeight);

            itemSize.height = avgHeight * ratio;
            itemSize.width = avgWidth * ratio;

            console.debug (ratio, itemSize, clientSize);

            var layer = new collie.Layer({
                width: clientSize.width,
                height: clientSize.height
            })

            console.log (pictures);
            collie.ImageManager.add(pictures);

            angular.forEach (pictures, function (link, id) {
                var item = new collie.DisplayObject({
                    name: id,
                    x: clientSize.width / 2,
                    y: clientSize.height / 2,
                    width: picture_repository[id].width,
                    height: picture_repository[id].height,
                    scaleX: ratio,
                    scaleY: ratio,
                    originX: 'left',
                    originY: 'top',
                    // velocityRotate: 50,
                    backgroundImage: id,
                    fitImage: true
                    // backgroundColor: '#000000'
                }).attach ({
                    mousedown: function (event) {
                        parameters.selectedItem = event.displayObject;
                        console.debug (event, parameters.selectedItem);
                    },
                    mouseup: function (event) {
                        console.debug ('mouseup')

                        parameters.selectedItem = null;
                    },
                    mousemove: function (event) {
                        if (parameters.selectedItem) {
                            parameters.selectedItem.x = event.x;
                            parameters.selectedItem.y = event.y;
                        }
                        console.debug (event);
                    }
                    /*
                    click: function (ev) {
                        if (control.isPlaying ()) {
                            console.log (ev);  
                            control.pause ();
                            angular.forEach (itemAnimations, function (item) {
                                item.pause ();
                            });
                        } else {
                            control.start ();
                            angular.forEach (itemAnimations, function (item) {
                                item.start ();
                            });

                        }
                    }
                    */
                }).addTo(layer);

                items.push(item);
            });

            // var layoutFunctions = [explodeImages];
            // var layoutFunctions = [layoutHorizontal, layoutRectangle, layoutCircle];
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
                arrangeItems.apply (arrangeItems, layoutFunctions[layoutSelectedIndex](parameters));
            }, 5000);

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
            });
        };

    }

    return {
        require: 'ngModel',
        restrict:'AE',
        link: link
    }
});

