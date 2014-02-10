angular.module ('facebook', []).provider ('facebook', function facebookProvider ($injector) {
    var initialized = false;
    var defaultParams = { appId: '245215608990152', status: true, cookie: true, xfbml: true };
    var facebookEvents = {
        'auth': ['authResponseChange', 'statusChange', 'login', 'logout']
    };

    var Q = [];

    this.init = function  (params) {
        window.fbAsyncInit = function() {
            FB.init(params || defaultParams);
    
            processQ ();

            initialized = true;
            console.log ("Faacebook initialization done.");
        };

        (function() {
            var e = document.createElement('script');
            e.type = 'text/javascript';
            e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
            e.async = true;
            document.getElementById('fb-root').appendChild(e);
        }(document));

    };

    this.addToQ = function (callback, self, args) {
        console.log ("adding to Q: ", callback);
        Q.push ([callback, self, args]);
    };


    var processQ = function () {
        console.log ('Processing Q messages.');
        while (item = Q.shift ()) {
            console.log (item);

            func = item[0];
            self = item[1];
            args = item[2];

            func.apply (self, args);
        }
    };

    var defer = function (func, deferred, $scope) {
        func (function (response) {
            if (response && response.error) {
                $scope.$apply (function () {
                    deferred.reject (response);
                });
            } else {
                $scope.$apply (function () {
                    deferred.resolve (response);
                });
            }
        });
    };

    this.$get = ["$rootScope", "$q",  function ($rootScope, $q) {
        var registerEventHandlers = function () {
            angular.forEach (facebookEvents, function (events, domain) {
                angular.forEach (events, function (_event) {
                    FB.Event.subscribe (domain + '.' + _event, function (response) {
                        $rootScope.$broadcast('fb.' + domain + '.' + _event, response);
                    });
                });
            });
        };
        
        var api = function (path) {
            deferred = $q.defer ();

            defer (function (callback) {
                FB.api (path, function (response) {
                    callback (response);
                });
            }, deferred, $rootScope);

            return deferred.promise;
        }

        if (!initialized) {
            this.addToQ (registerEventHandlers, this, []);
        } else {
            registerEventHandlers ();
        }

        return  {
            api: api
        }
    }];
});
