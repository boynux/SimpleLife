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
            speed: 10,
            currentSpeed: 6
        };

        var clientSize = {
            width : element.offsetParent ().width (),
            height : document.body.clientHeight - 100
        };

        console.debug (clientSize);
        var itemColors = ['#74ff00', '#88ff00', '#9dff00', '#b2ff00', '#c7ff00', '#b2ff00', '#9dff00', '#88ff00'];
        var itemAnimations = [];

        element.on ('mousemove',  function (event) {
            parameters.currentSpeed = Math.ceil (parameters.speed * (event.offsetX / clientSize.width - 0.5));
            console.log (parameters);
        });

        ngModel.$render = function () {
            console.debug('sl-album-show loaded', ngModel.$viewValue, element);

            console.log (element.width ());
            var itemSize = {
                width: 100,
                height: 100
            };

            var pictures = {};
            var picture_repository = {}
            var maxHeight = clientSize.height;
            var maxWidth = clientSize.width;
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

                maxHeight = Math.max (photo.height, maxHeight)
                maxWidth = Math.max (photo.width, maxWidth)
            });

            ratio = clientSize.height / maxHeight;

            itemSize.height = maxHeight * ratio / 3;
            itemSize.width = maxWidth * ratio;

            console.debug (ratio, itemSize, clientSize);
            var layer = new collie.Layer({
                width: clientSize.width,
                height: clientSize.height
            })

            console.log (pictures);
            collie.ImageManager.add(pictures);

            angular.forEach (pictures, function (link, id) {
                var item = new collie.DisplayObject({
                    x: clientSize.width / 2,
                    y: clientSize.height / 2,
                    width: picture_repository[id].width * ratio,
                    height: picture_repository[id].height *ratio,
                    // velocityRotate: 50,
                    backgroundImage: id,
                    // backgroundColor: '#000000'
                }).attach ({
                    click: function (ev) {
                        console.log (ev);  
                    }
                }).addTo(layer);

                items.push(item);
            });

            // var layoutFunctions = [explodeImages];
            var layoutFunctions = [layoutHorizontal, layoutRectangle, layoutCircle];
            var layoutFunctions = [scrollHorizontal];
            var layoutSelectedIndex = -1;

            var control = collie.Timer.repeat(function(oEvent){
                layoutSelectedIndex = (++layoutSelectedIndex) % layoutFunctions.length;
                layoutFunctions[layoutSelectedIndex](parameters);
            });

            itemCount = items.length;

            function scrollHorizontal (params) {
                var rows = 3;
                var cols = Math.ceil (itemCount/rows);

                var offsetX = - Math.round (cols / 2) * itemSize.width;
                var offsetY = - Math.round (rows / 2) * itemSize.height;

                var padding = 10;

                var speed = [];
                arrangeItems (function (i) {
                    speed[i] = (Math.random () * 10 % 5 + 5) / 10;

                    return {
                        x: offsetX + (i % cols) * itemSize.width + padding * (i % cols),
                         y: offsetY + (i % rows) * itemSize.height + padding * (i % rows),

                         originX: 'center',
                         originY: 'center'
                    }
                }, function (frame, idx, item) {
                    if (item.x >= -itemSize.width && item.x <= clientSize.width) { 
                        item.x -= speed[idx] * params.currentSpeed;
                    } else if (item.x > clientSize.width) {
                        item.x = -itemSize.width;
                    } else {
                        item.x = clientSize.width;
                    }
                })
            }

            function explodeImages () {
                var countX = Math.ceil(Math.sqrt(itemCount));
                var countY = Math.ceil(itemCount/countX);
                // var offsetX = - (countX/2)*itemSize;
                // var offsetY = - (countY/2)*itemSize;
                var offsetX = - clientSize.width / 2;
                var offsetY = - clientSize.height / 2;

                arrangeItems(function(i) {
                    var fill = {
                        x: clientSize.width / countX,
                    y: clientSize.height / countY
                    };

                    return {
                        x: offsetX + (i % countX) * fill.x + (fill.x - itemSize * Math.random ()),
                    y: offsetY + parseInt (i / countX) * fill.y + (fill.y - itemSize * Math.random ()),
                    width: itemSize,
                    height: itemSize,
                    // angle: 90 * Math.random (),
                    originX: "top",
                    originY: "left"
                    }
                }, function(frame, idx, info){
                    if (info.width > 0.4){
                        // info.width -= 0.4;
                        // info.height -= 0.4;
                    }
                });

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
                var item;

                while (itemAnimations.length)
                    itemAnimations.pop().stop();

                for (var i = 0; i < itemCount; i++){
                    var item = items[i];
                    from = item.get();
                    to = getTransitionInfo(i);
                    aFrom = [];
                    aTo = [];
                    set = [];
                    effects = [];

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
                        var params = {i:i, to:to, item:item};
                        return function (animationParams) {
                            updateRepeatInfo(animationParams.frame, params.i, params.to);
                            params.item.set(params.to);
                        }
                    }) (i, to, item);

                    itemAnimations.push(
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
            });
        };

    }

    return {
        require: 'ngModel',
        restrict:'AE',
        link: link
    }
});

