'use strict'

var simpleLifeControllers = angular.module ('simpleLifeControllers', []);

simpleLifeControllers.controller ('IndexCtrl', ['$scope', '$location', '$http',
    function ($scope, $location, $http) {
    }
]);

simpleLifeControllers.controller ('AlbumsCtrl', function ($scope, $http, $location) {
    $scope.add_album = function () {
        console.log ('adding new album');
    }
});

simpleLifeControllers.controller ('AlbumsListCtrl', ['$scope', '$http', '$location', 'facebook', 'RenewToken', '$sce', 
    function ($scope, $http, $location, $facebook, RenewToken, $sce) {
        console.log ($facebook.connected);

        if ($facebook.connected) {
            $facebook.api ('me/albums').then (function (result) {
                console.log (result);
                $scope.albums = result.data;
            });
        } else {
            $scope.$on ('fb.auth.authResponseChange', function (event, response) {
                if (response.status === 'connected') {
                    $facebook.api ('me/albums').then (function (result) {
                        console.log (result);
                        $scope.albums = result.data;
                    });
                }
            });
        }
        
        $scope.submit = function () {
            var albums = [];

            angular.forEach (this.albums, function (album) {
                if (album.selected) {
                    albums.push (album.id);
                }
            });

            $http.post ('albums', {albums: albums}).success (
                function (data, status, header, config) {
                    console.log ('data posted successfully');

                    $location.path ('/confirm');
                }
            ).error (function (reason) {
                !!reason && console.log (reason);
                $http.post ("/renew_token", {redirect_url: $location.absUrl ()})
                .success (function (response) {
                    console.log (response);
                    RenewToken.script = $sce.trustAsHtml (response);
                });
            });
        }
            
        $scope.wobble = function () {
            console.log (this);
        }
    }
]);

simpleLifeControllers.controller ('SigninCtrl', ['$rootScope', '$location', '$http',
    function ($rootScope, $location, $http) {
        console.log ($rootScope.user);
        if ($rootScope.user) {
            $location.path ('/');
        }
    }
]).controller ('SignOutCtrl', ['$scope', '$location', '$http', 
    function ($scope, $location, $http) {
        $http.get ('signout').success (function () {
            FB.logout (function (response) {
                $location.path ('/');
            });
        });
    }
]).controller ('ConfirmCtrl', ['$rootScope', '$scope', '$location', '$http', 'RenewToken', '$sce', 
    function ($rootScope, $scope, $location, $http, RenewToken, $sce) {
        $http.get ('/pictures').success (function (info) {
            console.log (info);
            $scope.albums = info;

            var itemColors = ['#74ff00', '#88ff00', '#9dff00', '#b2ff00', '#c7ff00', '#b2ff00', '#9dff00', '#88ff00'];
            var itemAnimations = [];

            var clientSize = {
                width : document.body.clientWidth - 300,
                height : 2000
            };

            var itemSize = 100;

            var layer = new collie.Layer({
                width: clientSize.width,
                height: clientSize.height
            });

            var pictures = {};
            var items = [];
            var itemCount = 0;

            angular.forEach ($scope.albums, function (album) {
                angular.forEach (album.data, function (photo) {
                    pictures[photo.id] = photo.picture;
                });
            });

            collie.ImageManager.add(pictures);

            angular.forEach (pictures, function (link, id) {
                item = new collie.DisplayObject({
                    x: clientSize.width / 2,
                    y: clientSize.height / 2,
                    width: itemSize,
                    height: itemSize,
                    // velocityRotate: 50,
                    backgroundImage: id,
                    backgroundColor: '#FFFFFF'
                }).attach ({
                    "click": function (ev) {
                        console.log (ev);  
                    }
                }).addTo(layer);

                items.push(item);
            });

            var layoutFunctions = [explodeImages];
            // var layoutFunctions = [layoutHorizontal, layoutRectangle, layoutCircle];
            var layoutSelectedIndex = -1;

            collie.Timer.repeat(function(oEvent){
                layoutSelectedIndex = (++layoutSelectedIndex) % layoutFunctions.length;
                layoutFunctions[layoutSelectedIndex]();
            }, 5000);

            itemCount = items.length;

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
                        info.width -= 0.4;
                        info.height -= 0.4;
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
            collie.Renderer.load(document.getElementById("container"));
            collie.Renderer.start();

            $scope.$on('$destroy', function(){
                while (itemAnimations.length)
                    itemAnimations.pop().stop();
            });
        }).error (function (reason) {
            !!reason && console.log (reason);
            $http.post ("/renew_token", {redirect_url: $location.absUrl ()})
                .success (function (response) {
                    console.log (response);
                    RenewToken.script = $sce.trustAsHtml (response);
                });
        });
    }
]).controller ('RenewTokenCtrl', function ($scope, RenewToken) {
    $scope.renewToken = RenewToken;
});

