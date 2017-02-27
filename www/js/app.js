// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'

// module dependencies
var app = angular.module('smartroom', [
    'ionic',
    'ngAnimate',
    'ngCordova',
    'ngIOS9UIWebViewPatch',
    'app.directives',
    'app.services',
    'app.factories',
    'app.filters',
    'jett.ionic.filter.bar'
]);

app.run(function($ionicPlatform, CredentialService, ServerConfig, AppConfigService, $rootScope, $state,
                 $cordovaNetwork, $ionicPopup) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Disable bouncing from login form input
      cordova.plugins.Keyboard.disableScroll(true);
    }

    if(window.StatusBar) {
      StatusBar.styleDefault();
    }

    // Allow android hardware back button only when current state is not login.
    // Otherwise exit app upon back button click.
    $ionicPlatform.registerBackButtonAction(function(event){
      if($state.current.name == 'login') {
        ionic.Platform.exitApp();
      } else {
         navigator.app.backHistory();
      }
    }, 100);

    document.addEventListener('deviceready', function () {

      // listen for Online event
      $rootScope.$on('$cordovaNetwork:online', function(event, networkState){
        CredentialService.init();

        $rootScope.$broadcast('deviceReady');
      });

      // listen for Offline event
      $rootScope.$on('$cordovaNetwork:offline', function(event, networkState){
        $ionicPopup.alert({
          title: 'Connection Error',
          template: 'Unable to connect to server. Please check your internet connection or VPN and try again.'
        });
      });

    }, false);

    var push = null;

    var app = {
      // Application Constructor
      initialize: function() {
        this.bindEvents();
      },
      // Bind Event Listeners
      //
      // Bind any events that are required on startup. Common events are:
      // 'load', 'deviceready', 'offline', and 'online'.
      bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener('resume', this.onDeviceResume, false);
      },
      // deviceready Event Handler
      //
      // The scope of 'this' is the event. In order to call the 'receivedEvent'
      // function, we must explicitly call 'app.receivedEvent(...);'
      onDeviceReady: function() {
        push = PushNotification.init({
          "android": {
            "senderID": "129218834313"
          },
          "ios": {"alert": "true", "badge": "true", "sound": "true"},
          "windows": {}
        });

        push.on('registration', function(data) {
          console.log('Token: ' + data.registrationId);
        });

        push.on('notification', function(data) {
          console.log(JSON.stringify(data));

          if(data.additionalData.foreground) {

            $ionicPopup.alert({
              title: 'SMARTRoom Notification',
              template: data.message
            });
          }

          push.setApplicationIconBadgeNumber(function() {
            console.log('setting badge number success');
          }, function() {
            console.log('error');
          }, 0);

          push.finish(function () {
            console.log('finish successfully called');
          });
        });

        push.on('error', function(e) {
          console.log("push error");
        });
      },
      onDeviceResume: function() {
        push.setApplicationIconBadgeNumber(function() {
          console.log('setting badge number success');
        }, function() {
          console.log('error');
        }, 0);
      }
    };

    // Remove this push notification feature for now
    //app.initialize();

    // Before using iBeacon, Bluetooth must be turned on.
    // Init BT plugin
    cordova.plugins.BluetoothStatus.initPlugin();

    // Android BT permission
    cordova.plugins.BluetoothStatus.promptForBT();

    // Prompting message box to ask users to enable BT on iOS
    if(!cordova.plugins.BluetoothStatus.iosAuthorized) {
      $ionicPopup.alert({
        template: 'Turn on Bluetooth to allow ranging nearby iBeacons.'
      });
    }

    // All beacons to track. List of beacons comes from LH server.
    var beacons = [
      {
        uuid        : '05F62A3D-F60F-44BC-B36E-2B80FD6C9679',
        identifier  : 'R1',
        minor       : 3,
        major       : 1
      },
      {
        uuid        : '8063b2fe-3b5f-4c79-9e03-bdec348b8589',
        identifier  : 'R2',
        minor       : 4,
        major       : 2
      }
    ];

    var BeaconRegions = [];

    for (var i in beacons) {
      var b = beacons[i];

      BeaconRegions[b.identifier] = new cordova.plugins.locationManager.BeaconRegion(b.identifier, b.uuid, b.major, b.minor);
    }

    // Beacon Plugin Delegation
    var delegate = new cordova.plugins.locationManager.Delegate();

    delegate.didStartMonitoringForRegion = function (result) {

      // Log to Xcode
      cordova.plugins.locationManager.appendToDeviceLog('didStartMonitoringForRegion: ' + JSON.stringify(result));
    };

    delegate.didEnterRegion = function (result) {

      // Log to Xcode
      cordova.plugins.locationManager.appendToDeviceLog('didEnterRegion: ' + JSON.stringify(result));

      console.log('didEnterRegion: ', result.region.identifier);

      // Start Ranging Beacon When it enters Inside Region
      cordova.plugins.locationManager.startRangingBeaconsInRegion(BeaconRegions[result.region.identifier])
        .fail(console.error)
        .done();
    };

    delegate.didExitRegion = function (result) {

      // Log to Xcode
      cordova.plugins.locationManager.appendToDeviceLog('didExitRegion: ' + JSON.stringify(result));

      console.log('didExitRegion: ', result.region.identifier);

      // Stop Ranging Beacon if Outside Region
      cordova.plugins.locationManager.stopRangingBeaconsInRegion(BeaconRegions[result.region.identifier])
        .fail(console.error)
        .done();
    };

    delegate.didDetermineStateForRegion = function (result) {

      // Log to Xcode
      cordova.plugins.locationManager.appendToDeviceLog('didDetermineStateForRegion: ' + JSON.stringify(result));

      console.log('didDetermineStateForRegion: ', result.region.identifier);
    };

    delegate.didRangeBeaconsInRegion = function (result) {

      // Log to Xcode
      cordova.plugins.locationManager.appendToDeviceLog('didRangeBeaconsInRegion: ' + JSON.stringify(result));

      console.log('didRangeBeaconsInRegion: ', result.region.identifier, result.beacons[0].proximity);
    };

    // Set Methods for Location Manager
    cordova.plugins.locationManager.setDelegate(delegate);

    // Ask for Permission
    cordova.plugins.locationManager.requestAlwaysAuthorization();

    // Loop BeaconRegions to setup region monitoring.
    for (var i in BeaconRegions) {
      var b = BeaconRegions[i];

      if (b == undefined) continue;

      cordova.plugins.locationManager.startMonitoringForRegion(b);
    }

  });
});
app.config(function($stateProvider, $ionicConfigProvider, $urlRouterProvider, $ionicFilterBarConfigProvider) {

  $ionicConfigProvider.tabs.position('bottom');

  // Override tabs background color for android
  $ionicConfigProvider.tabs.style('standard');

  // Clear text from back button
  $ionicConfigProvider.backButton.text('').icon('ion-ios-arrow-back');

  // Disable ios style swipe back navigation
  $ionicConfigProvider.views.swipeBackEnabled(false);

  // Overlay room list
  $ionicFilterBarConfigProvider.backdrop(true);

  // Search bar transition horizontally from right to left
  $ionicFilterBarConfigProvider.transition('horizontal');

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    .state('login',{
     url: "/login",
     cache:false,
     templateUrl: "./templates/login.html",
     controller: "LoginCtrl"
    })
    .state('tab',{
      url: "/tab",
      abstract:true,
      templateUrl: "./templates/main.html",
      controller: "TabCtrl"
    })
    .state('tab.home',{
      url: "/home",
      cache:false,
      views:{
        'tab-home': {
          templateUrl: "./templates/home.html",
          controller: "HomeCtrl"
        }
      }
    })
    .state('tab.home-roomschedule',{
      url: "/home-roomschedule/:param",
      cache:false,
      views:{
        'tab-home': {
          templateUrl: "./templates/home-roomschedule.html",
          controller: "HomeRoomScheduleCtrl"/*,
          params:['roomId']*/
        }
      }
    })
    .state('tab.reservation',{
      url: "/reservation",
      cache:false,
      views:{
        'tab-reservation': {
          templateUrl: "./templates/reservation.html",
          controller: "ReservationCtrl"
        }
      }
    }).state('tab.reservation-detail',{
      url: "/reservation-detail/:param",
      cache:false,
      views:{
        'tab-reservation': {
          templateUrl: "./templates/reservation-detail.html",
          controller: "ReservationDetailCtrl"
        }
      }
    })
    .state('tab.search',{
      url: "/search",
      cache:false,
      params: {
        scheduleID: null,
        meetingStart: null,
        meetingEnd: null,
        meetingDate: null,
        meetingSubject: null
      },
      views:{
        'tab-search': {
          templateUrl: "./templates/search.html",
          controller: "SearchCtrl"
        }
      }
    })
    .state('tab.search-result',{
      url: "/search-result/:param",
      cache:false,
      views:{
        'tab-search': {
          templateUrl: "./templates/search-result.html",
          controller: "SearchResultCtrl"
        }
      }
    })
    .state('tab.scan',{
      url: "/scan",
      cache:false,
      views:{
        'tab-scan': {
          templateUrl: "./templates/scan.html",
          controller: "ScanCtrl"
        }
      }
    })
    .state('tab.setting',{
      url: "/setting",
      cache:false,
      views:{
        'tab-setting': {
          templateUrl: "./templates/setting.html",
          controller: "SettingCtrl"
        }
      }
    })
    .state('tab.setting-app',{
      url: "/setting-app",
      cache:false,
      views:{
        'tab-setting': {
          templateUrl: "./templates/setting-app.html",
          controller: "SettingAppCtrl"
        }
      }
    })
    .state('tab.account-settings', {
      url: "/account-settings",
      cache: false,
      views: {
          'tab-setting': {
            templateUrl: "./templates/account-settings.html",
            controller: "AppSettingsCtrl"
          }
      }
    });

    $urlRouterProvider.otherwise('/login');
});


