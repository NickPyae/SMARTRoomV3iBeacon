app.controller('SearchCtrl', function ($rootScope, $scope, $state, $stateParams, RoomService, AppService, AppConfigService, MaskFac, $cordovaNetwork) {

    document.addEventListener('deviceready', function () {
      // listen for Online event
      $rootScope.$on('$cordovaNetwork:online', function (event, networkState) {
        prepareFilter();
      });

    }, false);

    console.log('Params from reservation: ');
    console.log($stateParams);

    prepareFilter();

    function prepareFilter() {
      MaskFac.loadingMask(true, 'Loading');

      AppConfigService.prepareFilter().then(function () {

        $scope.filterOptions = AppConfigService.filterOptions;

        $scope.userSettings = {
          levelFilter: AppConfigService.filter.level,
          siteFilter: AppConfigService.filter.site
        };

        MaskFac.loadingMask(false);
      }, function (errRes) {
        MaskFac.loadingMask(false);
        MaskFac.showMask(MaskFac.error, 'Loading available floors failed');
      });

      AppConfigService.prepareEquipment().then(function (equipmentsList) {

        $scope.equipments = equipmentsList;

        $scope.selectedEquipment = {
          item: $scope.equipments[0]
        }

        MaskFac.loadingMask(false);
      }, function (errRes) {
        MaskFac.loadingMask(false);
        MaskFac.showMask(MaskFac.error, 'Loading available equipments failed');
      });

    }

    $scope.recurring = getRecurring();
    $scope.recurring.item = $scope.recurring[0];

    function getRecurring() {
      return [
        {frequency: 'Never'},
        {frequency: 'Daily'},
        {frequency: 'Weekly'},
        {frequency: 'Monthly'}
      ];
    }

    $scope.showOrHideDateTime = true;
    $scope.showOrHideLocation = true;

    $scope.toggleDateTime = function () {
      $scope.showOrHideDateTime = !$scope.showOrHideDateTime;
    };

    $scope.toggleLocation = function() {
      $scope.showOrHideLocation = !$scope.showOrHideLocation;
    }

    $scope.options = {};

    function getClosestHalf(now, plus) {
      var add = plus ? 1 : 0;

      if (now.getMinutes() > 30) {
        return new Date(1970, 0, 1, now.getHours() + 1 + add, 0, 0);
      } else if (now.getMinutes() < 30) {
        return new Date(1970, 0, 1, now.getHours() + add, 30, 0);
      }
    }

    function getRoomReservedTime(reservedRoomDate, time) {

      var arr = getReservedDate(reservedRoomDate, time).split(/[- :]/);

      var reservedTime = new Date(arr[0], arr[1], arr[2], arr[3], arr[4], arr[5]);

      return reservedTime;
    }

    function getReservedDate(reservedRoomDate, time) {
      var hours = parseInt(time.substr(0, 2));

      if(time.indexOf('AM') !== -1 && hours === 12) {
        time = time.replace('12', '0');
      }
      if(time.indexOf('PM')  !== -1 && hours < 12) {
        time = time.replace(hours, (hours + 12));
      }

      var newTime = time.replace(/(AM|PM)/, '');

      var fullDate = reservedRoomDate.getFullYear() + '-' + reservedRoomDate.getMonth() + '-' +
        reservedRoomDate.getDate() + ' ' + newTime + ':00';

      return fullDate;
    }

    $scope.$on('search.refresh', function () {
      if($stateParams.scheduleID) {
        var now = new Date($stateParams.meetingDate); // Reserved Date

        $scope.options = {
          date: now,
          start: getRoomReservedTime(now, $stateParams.meetingStart), //Star Time
          end: getRoomReservedTime(now, $stateParams.meetingEnd), //End Time
          seats: 1,
          endRepeatDate: new Date()
        };
      } else {
        var now = new Date();

        $scope.options = {
          date: now,
          start: getClosestHalf(now, false),
          end: getClosestHalf(now, true),
          seats: 1,
          endRepeatDate: now
        };
      }

    });

    //==Validation
    $scope.validated = true;
    $scope.errorMsg = "";
    function timeValidate(start, end) {
      if (start && end && start < end) {
        return true;
      } else {
        return false;
      }
    }


    $scope.$watch('options', function (nv) {
      //time/seats validation
      if (!timeValidate(nv.start, nv.end)) {
        $scope.errorMsg = "Start Time must be earlier than End Time";
        $scope.validated = false;
      } else if (nv.seats < 1 || nv.seats > 5000) {
        $scope.errorMsg = "Seating Capacity Min. 1 | Max. 5000";
        $scope.validated = false;
      } else {
        $scope.validated = true;
      }
    }, true);
    //==End Validation


    $scope.search = function (options) {

      if($scope.selectedEquipment.item.value) {
        options.equipmentID = $scope.selectedEquipment.item.equipmentID;
      } else {
        options.equipmentID = '';
      }

      if($stateParams.scheduleID) {
        options.subject = $stateParams.meetingSubject;
        options.scheduleID = $stateParams.scheduleID;
      }


      if (!$scope.userSettings.levelFilter.value) {
        options.floorID = '';
      } else {
        options.floorID = $scope.userSettings.levelFilter.floorID;
      }

      if(!$scope.userSettings.siteFilter.value) {
        options.siteID = '';
      } else {
        options.siteID = $scope.userSettings.siteFilter.value;
      }

      if($scope.recurring.item.frequency === 'Never') {
        options.repeat = '';
        options.isRecurrence = 'false';
      } else {
        options.repeat = $scope.recurring.item.frequency;
        options.isRecurrence = 'true';
      }

      $state.go('tab.search-result', {param: JSON.stringify(options)});
    };
    AppService.newSearch();

  })
  .controller('SearchResultCtrl', function ($scope, $state, $stateParams, $timeout, $ionicPopup, RoomService, MaskFac, AppService, AppConfigService, $ionicScrollDelegate) {
    MaskFac.loadingMask(true, 'Searching');

    var param = JSON.parse($stateParams.param);

    console.log('Params from search: ');
    console.log(param);

    var imageUrl = null;
    //get image Url
    RoomService.getImageUrl().then(function (res) {
      imageUrl = res;
    });

    $scope.getImage = function (siteID, path) {
      if (imageUrl) {
        if (siteID && path) {
          return imageUrl + '/' + siteID + '/' + path;
        } else {
          return './img/noimageavailable.png';
        }
      }
      else {
        return '';
      }
    };

    $scope.fullScreen = function (url) {
      MaskFac.imageMask(url);
    };

    $scope.filterOn = false;
    $scope.canToggleFilter = false;
    var allRoomsList = {rooms: []};
    var filteredRoomsList = {rooms: []};

    AppConfigService.hasFilter().then(function (isFilter) {
      $scope.canToggleFilter = isFilter;
      $scope.filterOn = isFilter;
    });

    $scope.filterSearch = function () {
      if ($scope.canToggleFilter) {
        $scope.filterOn = !$scope.filterOn;

        $scope.AllRoom = [];
        $scope.lstRoom = [];
        getRoomsByFilter();
      } else {
        MaskFac.showMask(MaskFac.warning, "Filter not applied. Please go to App Settings");
      }
    };

    //==show time slot which user searched for
    $scope.slot = tConvert(formatTime(param.start)) + " to " + tConvert(formatTime(param.end));
    function formatTime(_t) {
      var t = new Date(_t);
      return pad(t.getHours(), 2) + ":" + pad(t.getMinutes(), 2);
    }

    function pad(n, width, z) {
      z = z || '0';
      n = n + '';
      return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }

    function formatDate(_d) {
      var d = new Date(_d);
      return pad(d.getDate(), 2) + "-" + pad((d.getMonth() + 1), 2) + "-" + d.getFullYear();
    }

    //==end

    // Clearing $stateParams
    $scope.goBackToSearch = function() {
      $state.go('tab.search', {scheduleID: null, meetingStart: null, meetingEnd: null, meetingDate: null, meetingSubject: null});
    }

    $scope.lstRoom = [];
    $scope.loadNext = 5;
    $scope.AllRoom = [];
    $scope.reserve = {des: ""};

    $scope.loadMore = function () {
      var addThese = [];
      if ($scope.lstRoom.length + $scope.loadNext >= $scope.AllRoom.length)
        addThese = $scope.AllRoom.slice($scope.lstRoom.length, $scope.AllRoom.length);
      else
        addThese = $scope.AllRoom.slice($scope.lstRoom.length, $scope.lstRoom.length + $scope.loadNext);


      angular.forEach(addThese, function (r) {
        $scope.lstRoom.push(r);
      });

      $timeout(function () {
        $scope.$broadcast('scroll.infiniteScrollComplete'); //to update the screen
      }, 1000);
    };

    $scope.getSlots = function (roomID, slotShow) {

      if (slotShow === true) {
        MaskFac.loadingMask(true, 'Loading');

        RoomService.getRoomSlots(roomID, param.date).then(function (res) {

          angular.forEach($scope.lstRoom, function (room) {

            if (room.id === roomID) {

              if (room.slots.length > 0) {
                room.slots.splice(0, room.slots.length);
              }

              angular.forEach(res, function (s) {
                room.slots.push(roomSlot(s));
              });
            }
          })

          MaskFac.loadingMask(false);
        });
      }
    };

    function roomSlot(rTimeslots) {
      var _slot = {};

      _slot.originalStart = rTimeslots.start;
      _slot.start = tConvert(rTimeslots.start);
      _slot.end = tConvert(rTimeslots.end);
      _slot.originalEnd = rTimeslots.end;
      // Status --> Starting, Started, Vacant or Pending
      _slot.status = angular.lowercase(rTimeslots.status);
      _slot.info = rTimeslots.info;
      _slot.contact = rTimeslots.contact;
      _slot.num = rTimeslots.num;
      _slot.jabber = rTimeslots.jabber;

      return _slot;
    }

    function tConvert(time) {
      // Check correct time format and split into components
      time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

      if (time.length > 1) { // If time format correct
        time = time.slice (1);  // Remove full string match value
        time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
        time[0] = +time[0] % 12 || 12; // Adjust hours
      }
      return time.join (''); // return adjusted time or original string
    }

    //==ON INIT->see param structure from SearchCtrl;
    //getRoomsByFilter();
    getAllAvailableRooms();
    //==end

    function getRoomsByFilter() {

      if ($scope.filterOn) {
        angular.forEach($scope.AllRoom, function (room) {

          if (AppConfigService.filter.site.value || AppConfigService.filter.level.value) {
            if (AppConfigService.filter.site.value && AppConfigService.filter.level.value) {
              if (room.siteID == AppConfigService.filter.site.value && room.floorName == AppConfigService.filter.level.value) {
                // has site & floor filter
                filteredRoomsList.rooms.push(room);
              }
            } else if (AppConfigService.filter.site.value && room.siteID == AppConfigService.filter.site.value) {
              // has site filter only
              filteredRoomsList.rooms.push(room);
            } else if (AppConfigService.filter.level.value && room.floorName == AppConfigService.filter.level.value) {
              // has floor filter only
              filteredRoomsList.rooms.push(room);
            }
          }

        });

        $scope.AllRoom = filteredRoomsList.rooms;
      } else {
        // has no filter
        $scope.AllRoom = allRoomsList.rooms;
      }

      $scope.lstRoom = $scope.AllRoom.slice(0, $scope.loadNext + 5);
      $ionicScrollDelegate.$getByHandle('mainScroll').scrollTop();
    }

    function getAllAvailableRooms() {
      RoomService.getAvailableRooms(param.date, param.start, param.end, param.seats, param.floorID,
        param.siteID, param.scheduleID, param.equipmentID, param.repeat, param.endRepeatDate, param.isRecurrence).then(function (res) {

        allRoomsList.rooms = res;

        if ($scope.filterOn) {

          angular.forEach(res, function (room) {

            if (AppConfigService.filter.site.value || AppConfigService.filter.level.value) {
              if (AppConfigService.filter.site.value && AppConfigService.filter.level.value) {
                if (room.siteID == AppConfigService.filter.site.value && room.floorName == AppConfigService.filter.level.value) {
                  // has site & floor filter
                  filteredRoomsList.rooms.push(room);
                }
              } else if (AppConfigService.filter.site.value && room.siteID == AppConfigService.filter.site.value) {
                // has site filter only
                filteredRoomsList.rooms.push(room);
              } else if (AppConfigService.filter.level.value && room.floorName == AppConfigService.filter.level.value) {
                // has floor filter only
                filteredRoomsList.rooms.push(room);
              }
            }

          });

          $scope.AllRoom = filteredRoomsList.rooms;
        } else {
          // has no filter
          $scope.AllRoom = allRoomsList.rooms;
        }

        MaskFac.loadingMask(false);

        if(res.length === 0) {
          MaskFac.showMask(MaskFac.warning, 'No available rooms');
        }

        $scope.lstRoom = $scope.AllRoom.slice(0, $scope.loadNext + 5);
        $ionicScrollDelegate.$getByHandle('mainScroll').scrollTop();
      }, function (errRes) {
        MaskFac.loadingMask(false);
        MaskFac.showMask(MaskFac.error, 'Searching rooms failed');
      });
    }

    //scope functions
    $scope.roomCss = function (status) {
      return RoomService.getRoomCss(status);
    };

    function callReservation(id, name, start, end) {
      if (!start || !end) {
        start = param.start;
        end = param.end;
      }
    }

    $scope.slotShowIconCss = function (isShow) {
      if (isShow) {
        return "ion-arrow-up-b";
      }
      else {
        return "ion-arrow-down-b";
      }
    };

    $scope.lstSelected = [];

    $scope.selectTimeSlot = function (slot, slots) {
      if ($scope.lstSelected.length == 1) {
        $scope.lstSelected.push(slot);
        groupSlots(slots, $scope.lstSelected[0], $scope.lstSelected[1]);

      } else {
        //restart
        $scope.lstSelected = [];

        $scope.lstSelected.push(slot);

        groupSlots(slots, $scope.lstSelected[0], $scope.lstSelected[1] ? $scope.lstSelected[1] : null);
      }
    };

    //algo to verify valid date range is selected
    function groupSlots(allSlots, _first, _second) {
      var myFirst, mySecond;
      var lstSelected = [];//reset lstSelected

      if (_first && _second) {

        //start sorting which is start which is end
        //check in between slots
        var f1 = parseInt(_first.originalStart.replace(/([A-Za-z])/g, '').replace(":", ""));
        var f2 = parseInt(_second.originalStart.replace(/([A-Za-z])/g, '').replace(":", ""));
        if (f1 > f2) {

          myFirst = f2;
          mySecond = f1;
        } else {

          myFirst = f1;
          mySecond = f2;
        }

        for (var i = 0; i < allSlots.length; i++) {
          var sNum = parseInt(allSlots[i].originalStart.replace(/([A-Za-z])/g, '').replace(":", ""));

          if (sNum >= myFirst && sNum <= mySecond) {
            if (allSlots[i].status == 'vacant') {
              allSlots[i].checked = true;
              lstSelected.push(allSlots[i]);
            } else {
              //erase all
              angular.forEach(allSlots, function (s) {
                if (s != _first) {
                  s.checked = false;
                }
              });

              lstSelected = [];
              //exit
              break;
            }
          }
          else {
            allSlots[i].checked = false;
          }
        }
      } else {

        lstSelected = [];
        //reset
        angular.forEach(allSlots, function (s) {
          if (_first && s.originalStart == _first.originalStart) {
            s.checked = true;
            lstSelected.push(s);
          } else {
            s.checked = false;
          }
        });
      }
    }

    function getFormatDate(date) {
      //yyyy-mm-dd
      var d = new Date(date);
      return d.getFullYear() + "-" + pad((d.getMonth() + 1), 2) + "-" + pad(d.getDate(), 2);
    }

    $scope.reserve = function (id, name, slots, enforceDefaultSelection) {
      var useSlot = '';

      var isSlotChecked = false;
      if (enforceDefaultSelection) {
        isSlotChecked = true;
        //Lara 10Feb16: this will the default slot
        useSlot = RoomService.formatSlotDisplay([], $scope.slot);
      } else {
        //Lara 10Feb16: this will use the selected slot
        useSlot = RoomService.formatSlotDisplay(slots, $scope.slot);
        if (slots.length === 0) {
          isSlotChecked = false;
        }

        if (slots.length !== 0) {
          angular.forEach(slots, function (s) {
            if (s) {
              if (s.checked) {
                isSlotChecked = true;
              }
            }
          });
        }
      }

      // If the scheduleID data comes from reservation, there must be subject data too
      if(param.scheduleID) {
        $scope.reserve.des = param.subject;
      } else {
        $scope.reserve.des = '';
      }

      if (isSlotChecked === true) {

        try {
          cordova.plugins.Keyboard.disableScroll(false);
        } catch (err) {
        }

        var mypopup = null;
        //$scope.regex = /^[ A-Za-z0-9_@\/\\.,#&$%@():!+-]*$/;
        //Lara 11Feb16: http://stackoverflow.com/questions/1444666/regular-expression-to-match-all-characters-on-a-u-s-keyboard
        $scope.regex = /^[\x20-\x7F]*$/;

        //Lara 11Feb16: Added regex on input as btoa will fail.
        mypopup = $ionicPopup.show({
          //template: '<input type="text" ng-model="reserve.des" placeholder="Please Enter Description"><div field-req ng-hide="reserve.des"></div>',
          template: 'Room: <b>' + name + '</b><br>Date: <b>' + formatDate(param.date) + '</b>' + '</b><br>' + useSlot + '<br><form name="myForm"><input type="text" placeholder="Subject" name="subject" ng-pattern="regex" ng-model="reserve.des" required>' +
          '<div field-req ng-show="myForm.subject.$error.required"></div>' + '<div invalid-char ng-show="myForm.subject.$error.pattern"></div></form>',
          title: 'Confirm Reservation ',
          //subTitle: 'Room: <b>' + name + '</b><br>Date: <b>' + formatDate(param.date) + '</b>'+ '</b><br>' + useSlot,
          scope: $scope,
          buttons: [
            {text: 'Cancel'},
            {
              text: '<b>Reserve</b>',
              type: 'button-positive',
              onTap: function (e) {

                if ($scope.reserve.des && $scope.reserve.des != "") {
                  return $scope.reserve.des;
                } else {
                  e.preventDefault();
                }
              }
            }
          ]
        });

        mypopup.then(function (res) {
          if (res) {

            MaskFac.loadingMask(true, 'Processing');
            var selectedSlots = [];
            var todayDate = getFormatDate(param.date);
            //Lara 10Feb16:  allow clicking 'Reserve' for searched time frame
            if (enforceDefaultSelection) {
              var s = $scope.slot.split("to");
              selectedSlots.push({'start': tConvert(s[0].replace(' ', '')), 'end': s[1]});//start is important
              selectedSlots.push({'start': s[1], 'end': tConvert(s[1].replace(' ', ''))});//end is important
            } else {
              angular.forEach(slots, function (s) {
                if (s.checked) {
                  selectedSlots.push({'start': s.start, 'end': s.end});
                }
              });
            }

            var start = selectedSlots[0].start;
            var end = selectedSlots[selectedSlots.length - 1].end;
            var subject = res;

            RoomService.reserveRoom(id, todayDate, start, end, subject)
              .then(function (res) {
                MaskFac.loadingMask(false);

                if(res.status.toLowerCase() === 'pending') {
                  MaskFac.showMask(MaskFac.success, "Booking of your meeting room is pending admin approval.");
                } else {
                  MaskFac.showMask(MaskFac.success, "Reservation successful.");
                }

                // Allow page to show room reserved mask before transition
                $timeout(function () {
                  //go to reservations
                  AppService.eventSuccess('room-reserved');
                }, 1200);

              }, function (errRes) {
                MaskFac.showMask(MaskFac.error, "Error reserving room. Please try again");
              });
          } else {
            $scope.reserve.des = '';
          }
        });

      } else {
        MaskFac.showMask(MaskFac.warning, 'Please select time slots first');
      }
    };

    $scope.selRoom = null;
    $scope.viewOtherSlots = function (r) {
      $scope.selRoom = r;
      // An elaborate, custom popup
      var myPopup = $ionicPopup.show({
        templateUrl: 'view-slots.html',
        title: 'Reserve Room: ' + r.name,
        scope: $scope
        ,
        buttons: [
          {text: 'Cancel'},
          {
            text: '<b>Reserve</b>',
            type: 'button-balanced',
            onTap: function (e) {
              if (!$scope.selRoom.des) {
                //don't allow the user to close unless he enters wifi password
                e.preventDefault();
              } else {
                return $scope.selRoom.des;
              }

              //if no slots click
              //e.preventDefault();
              //else
              //call reserveRoom();
            }
          }
        ]
      });
      myPopup.then(function (res) {
        if (res) {
          callReservation(r.id, res);
        }
      });
    };

    //Suggestions for sticky
    //use ionic.domUtil.getPositionInParent(document.query(...)); to find if item has passed header.

  });
