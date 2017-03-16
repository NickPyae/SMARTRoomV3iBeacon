angular.module('app.services', [])
  .service('RoomService', function($rootScope,$timeout,$q, $http, CredentialService, ServerConfig){
    var self = this;
    //CONSTANTS TO BE USED THROUGHOUT ROOMS
    self.started = 'started';
    self.starting = 'starting';
    self.pending = 'pending';
    self.roomList = [];
    self.reservedScheduleID = null;
    self.reservedRoomList = [];
    function roomInfo(rHostName, rId, rName, rImg, rStatus, rMeetingInfo, rMeetingStart, rMeetingEnd, rReservedDate, rLocationId,
                      rSiteName, rSeatingCapacity, rFloorplan, rFloorName, rGroup, xLocation, yLocation, remarks){
      var room={};
      room.hostname = rHostName;
      room.id =rId;
      room.name = rName;
      room.meetingInfo = rMeetingInfo;
      room.meetingStart = rMeetingStart;
      room.meetingEnd = rMeetingEnd;
      room.reservedDate = rReservedDate;
      room.img = rImg;
      room.status = rStatus;
      room.siteId=rLocationId;
      room.siteName = rSiteName;
      room.seatingCapacity = rSeatingCapacity;
      room.floorplanImg = rFloorplan;
      room.floorName = rFloorName;
      room.group = rGroup;
      room.xLocation = xLocation;
      room.yLocation = yLocation;
      room.remarks = remarks;
      return room;
    }

    function roomDetails(rId, rName, rLocation, rSiteID, rSeating, rTimeslots, rImg, rFloor, rFloorName, xLocation, yLocation){
      var _room ={};
      _room.id = rId;
      _room.name = rName;
      _room.location = rLocation;
      _room.siteID = rSiteID;
      _room.seating = rSeating;
      _room.slots = [];
      angular.forEach(rTimeslots,function(s){
        _room.slots.push(roomSlot(s));
      });
      _room.img = rImg;
      _room.floor = rFloor;
      _room.floorName = rFloorName;
      _room.xLocation = xLocation;
      _room.yLocation = yLocation;
      return _room;
    }

    function roomSlot(rTimeslots){
      var _slot = {};

      // Nick
      _slot.originalStart = rTimeslots.start;
      _slot.start = tConvert(rTimeslots.start);
      _slot.end = tConvert(rTimeslots.end);
      _slot.originalEnd = rTimeslots.end;
      // Status --> Starting, Started,  Vacant or Pending
      _slot.status = angular.lowercase(rTimeslots.status);
      _slot.info = rTimeslots.info;
      _slot.contact = rTimeslots.contact;
      _slot.num = rTimeslots.num;
      _slot.jabber = rTimeslots.jabber;

      return _slot;
    }

    function attendeeDetails(a){
      var _details = {};
      _details.name = a.name;
      _details.num = a.tel; //call/msg
      _details.email = a.email;
      return _details;
    }

    function meetingDetails(mId, mMeetingName, mRoomName, mLocation, mSiteID, mStatus, mStart, mEnd, mImg, mFloor, mAttendees, floorName, mReservedDate, xLocation, yLocation, remarks){
      var _meeting ={};
      _meeting.id = mId;
      _meeting.name = mMeetingName;
      _meeting.roomName = mRoomName;
      _meeting.location = mLocation;

      _meeting.status = mStatus;
      _meeting.attendees = [];
      _meeting.count = "Attendees: ";
      _meeting.count +=  mAttendees ? mAttendees.length : 'N.A'; //Bug fix here- i can't get Attendees. and length to render at the same time
      angular.forEach(mAttendees,function(a){
        _meeting.attendees.push(attendeeDetails(a));
      });

      _meeting.siteID = mSiteID;
      _meeting.img = mImg;// ? mImg: "8pax.jpg";
      _meeting.floor = mFloor;// ? mFloor: "L14.png";
      _meeting.start = mStart;
      _meeting.end = mEnd;
      _meeting.floorName = floorName;
      _meeting.reservedDate = mReservedDate;
      _meeting.xLocation = xLocation;
      _meeting.yLocation = yLocation;
      _meeting.remarks = remarks;

      return _meeting;
    }
    var cannedAttendees=[{
      "name": "alice",
      "tel" : "+6512345678",
      "email": "alice.ang@ebd.com"
    },{
      "name": "betty",
      "tel" : "+6512345678",
      "email": "betty.bu@ebd.com"
    },{
      "name": "celia",
      "tel" : "+6512345678",
      "email": "celia.cho@ebd.com"
    },{
      "name": "dania",
      "tel" : "+6512345678",
      "email": "dania.dong@ebd.com"
    },{
      "name": "elaine"
    },{
      "name": "fiona",
      "tel" : "+6512345678",
      "email": "fiona.fang@ebd.com"
    },{
      "name": "gina",
      "tel" : "+6512345678",
      "email": "gina.goh@ebd.com"
    },{
      "name": "helena",
      "tel" : "+6512345678",
      "email": "helena.hong@ebd.com"
    },{
      "name": "ilysia",
      "tel" : "+6512345678",
      "email": "ilysia.ing@ebd.com"
    },{
      "name": "jane",
      "tel" : "+6512345678",
      "email": "jane.ju@ebd.com"
    },{
      "name": "kaitlyn",
      "tel" : "+6512345678",
      "email": "kaitlyn.kong@ebd.com"
    }];
    //for reservation-controller.js
    self.getMeetingInfo = function(id){

      // Get additional values from Reservations web service
      var reservedRoomList = self.getReservedRoomList();

      var siteID = null;
      var roomImg = null;
      var siteName = null;
      var floorplanImage = null;
      var floorName = null;
      var xLocation = null;
      var yLocation = null;
      var remarks = null;

      for(var index in reservedRoomList) {
        if(reservedRoomList[index].id === id) {
          siteID = reservedRoomList[index].siteId;
          roomImg = reservedRoomList[index].img;
          siteName = reservedRoomList[index].siteName;
          floorplanImage = reservedRoomList[index].floorplanImg;
          floorName = reservedRoomList[index].floorName;
          xLocation = reservedRoomList[index].xLocation;
          yLocation = reservedRoomList[index].yLocation;
          remarks = reservedRoomList[index].remarks;
          break;
        }
      }

      var def = $q.defer();
      if(!id)
        def.reject("id not found");

      var encodedScheduleId = btoa(id);

      ServerConfig.getUrl(ServerConfig.scheduleInfo).then(function(res){

        var url = res + "?callback=JSON_CALLBACK&scheduleid=" + encodedScheduleId;

        console.log('Schedule detail url: ' + url);

        $http.jsonp(url).
        success(function (data, status, headers, config) {
          var m = data;
          var status = null;

          //var hwMany = Math.floor(Math.random()* 11 + 1);
          //m.attendees=cannedAttendees.slice(0, hwMany);
          if(m.status.toLowerCase() === 'starting') {
            status = 'RESERVED';
          } else if (m.status.toLowerCase() === 'started') {
            status = 'OCCUPIED';
          } else if(m.status.toLowerCase() === 'pending') {
            status = 'PENDING ADMIN APPROVAL';
          }

          var myQueriedMeeting = meetingDetails(m.id, m.schedulename, m.roomname,
            siteName, siteID, status, tConvert(m.StartTime), tConvert(m.EndTime),
            roomImg, floorplanImage, m.Attendees, floorName, m.Date, xLocation, yLocation, remarks);

          // meetingDetails with fake attendees.
          //var myQueriedMeeting = meetingDetails(m.id, m.schedulename, m.roomname,
          //	siteName, siteID, status, tConvert(m.StartTime), tConvert(m.EndTime),
          //			 roomImg, floorplanImage, m.attendees, floorName, m.Date, xLocation, yLocation, '');

          def.resolve(myQueriedMeeting);
        }).
        error(function(data, status, headers, config) {
          def.reject(data);
        });
      },function(errRes){
        def.reject(errRes);
      });

      return def.promise;
    };
    //for home-controller.js to query
    self.getRoomInfo = function(id){
      var def = $q.defer();

      var encodedUid = btoa(CredentialService.getUid());
      var encodedRid = btoa(id);
      // Today's date is always added for room slots
      var encodedFromDate = btoa(formatDate(new Date()));

      ServerConfig.getScheduleSlotUrl(ServerConfig.scheduleslot).then(function(res){

        // Get all rooms from Rooms web service
        var roomList = self.getRoomList();

        var siteID = null;
        var roomImg = null;
        var siteName = null;
        var seatingCap = null;
        var floorplanImage = null;
        var xLocation = null;
        var yLocation = null;

        for(var index in roomList) {
          if(roomList[index].id === id) {
            siteID = roomList[index].siteId;
            roomImg = roomList[index].img;
            siteName = roomList[index].siteName;
            seatingCap = roomList[index].seatingCapacity;
            floorplanImage = roomList[index].floorplanImg;
            xLocation = roomList[index].xLocation;
            yLocation = roomList[index].yLocation;
            break;
          }
        }

        var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid +
          "&rid=" + encodedRid + "&FromDate=" + encodedFromDate;

        console.log('Room detailed info url: ' + url);

        $http.jsonp(url)
          .success(function (data, status, headers, config) {

            var myQueriedRoom = null;

            angular.forEach(data,function(r){

              myQueriedRoom = roomDetails(r.id, r.name,
                siteName, siteID, seatingCap, r.slots,
                roomImg, floorplanImage, r.floorname, xLocation, yLocation);
            });

            def.resolve(myQueriedRoom);
          })
          .error(function(errRes){
            def.reject(errRes);
          });
      });

      return def.promise;
    };

    self.getRoomSlots = function(roomID, fromDate) {
      var def = $q.defer();
      var useDate = formatDate(fromDate);

      var encodedUid = btoa(CredentialService.getUid());
      var encodedRid = btoa(roomID);
      var encodedFromDate = btoa(useDate);

      ServerConfig.getScheduleSlotUrl(ServerConfig.scheduleslot).then(function(res){

        var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid +
          "&rid=" + encodedRid + "&FromDate=" + encodedFromDate;

        console.log('Get all slots url: ' + url);

        $http.jsonp(url)
          .success(function (data, status, headers, config) {

            var roomSlots = null;

            angular.forEach(data,function(r){

              roomSlots = r.slots;
            });

            def.resolve(roomSlots);
          })
          .error(function(errRes){
            def.reject(errRes);
          });
      });

      return def.promise;
    };

    //for home-controller.js to query dashboard rooms
    self.getAllRooms = function(){
      var def = $q.defer();

      var encodedUid = btoa(CredentialService.getUid());

      ServerConfig.getUrl(ServerConfig.allRoom).then(function(res){

        var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid;

        console.log('Get all rooms url: ' + url);

        $http.jsonp(url)
          .success(function (data, status, headers, config) {
            var lstRooms =[];
            var subject = null;
            var hostname = null;
            var startTime = null;
            var endTime = null;

            angular.forEach(data,function(r){

              if(angular.lowercase(r.ResourceType) === 'room') {

                if(r.nextschedule.length > 0) {
                  // nextschedule is missing starttime, endtime missing
                  // r.nextschedule will be array of object

                  // Get next schedule name, start time & end time
                  subject = r.nextschedule[0].schedulename;
                  hostname = r.nextschedule[0].username;
                  startTime= formatHourMin(parseInt(r.nextschedule[0].startTime));
                  endTime= formatHourMin(parseInt(r.nextschedule[0].endTime));

                  // Reservation date is empty
                  lstRooms.push
                  (
                    roomInfo(hostname, r.roomid, r.roomname, r.imagesrc, angular.lowercase(r.status), subject, tConvert(startTime), tConvert(endTime), '', r.siteid,
                      r.sitename, r.seatingcapacity, r.floorplan, r.floorname, '', r.xLocation, r.yLocation, '')

                  );
                } else {
                  lstRooms.push(roomInfo('', r.roomid, r.roomname, r.imagesrc, angular.lowercase(r.status), '', '', '', '', r.siteid, r.sitename,
                    r.seatingcapacity, r.floorplan, r.floorname, '', r.xLocation, r.yLocation, ''));
                }
              }
            });

            /** Nick */
            self.setRoomList(lstRooms);

            def.resolve(lstRooms);
          })
          .error(function(a,b,c,d){

            def.reject(a);
          });
      });

      return def.promise;
    };


    self.getMyReservationForSpecificRoom = function(roomID) {
      var def = $q.defer();

      var encodedUid = btoa(CredentialService.getUid());

      ServerConfig.getUrl(ServerConfig.myReservation).then(function(res){

        var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid;

        console.log('Get reservation for specific room url: ' + url);

        var roomData = null;
        $http.jsonp(url)
          .success(function (data, status, headers, config) {

            var lstRooms =[];

            angular.forEach(data,function(r){
              try{
                var reservedDate = getFormatReservedDate(r.date);

                var roomList = self.getRoomList();

                var xLocation = null;
                var yLocation = null;

                for(var index in roomList) {
                  if(roomList[index].id === r.roomid) {
                    xLocation = roomList[index].xLocation;
                    yLocation = roomList[index].yLocation;
                    break;
                  }
                }

                //use scheduleid instead of roomid
                // roomInfo has reservation date
                lstRooms.push(
                  roomInfo('', r.scheduleid, r.roomname, r.imgsrc, angular.lowercase(r.status), r.name, tConvert(r.starttime), tConvert(r.endtime), reservedDate, r.siteid,
                    r.sitename, r.seatingcapacity, r.floorplan, r.floorname, r.Group, xLocation, yLocation, r.remarks)
                );

                //Lara 29Jan16: only catch the first reservation for this roomId
                if(!roomData && r.roomid === roomID) {
                  roomData = r;
                }
              }catch(err){

              }
            });

            /** Nick */
            self.setReservedRoomList(lstRooms);

            def.resolve(roomData);
          })
          .error(function(errRes){
            def.reject(errRes);

          });
      },function(errRes){
        def.reject(errRes);
      });
      return def.promise;
    }
    //for reservation-controller.js to query
    self.getMyReservations = function(){
      var def = $q.defer();

      var encodedUid = btoa(CredentialService.getUid());

      ServerConfig.getUrl(ServerConfig.myReservation).then(function(res){

        var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid;

        console.log('Get all reservations url: ' + url);

        $http.jsonp(url)
          .success(function (data, status, headers, config) {
            var lstRooms =[];
            angular.forEach(data,function(r){
              try{
                var reservedDate = getFormatReservedDate(r.date);

                var roomList = self.getRoomList();

                var xLocation = null;
                var yLocation = null;

                for(var index in roomList) {
                  if(roomList[index].id === r.roomid) {
                    xLocation = roomList[index].xLocation;
                    yLocation = roomList[index].yLocation;
                    break;
                  }
                }

                //use scheduleid instead of roomid
                // roomInfo has reservation date
                lstRooms.push(
                  roomInfo(r.hostname, r.scheduleid, r.roomname, r.imgsrc, angular.lowercase(r.status), r.name, tConvert(r.starttime), tConvert(r.endtime), reservedDate, r.siteid,
                    r.sitename, r.seatingcapacity, r.floorplan, r.floorname, r.Group, xLocation, yLocation, r.remarks)
                );
              }catch(err){
              }
            });

            /** Nick */
            self.setReservedRoomList(lstRooms);

            def.resolve(lstRooms);
          })
          .error(function(errRes,b,c){
            def.reject(errRes);

          });
      },function(errRes){
        def.reject(errRes);
      });

      return def.promise;
    };

    function getFormatReservedDate(date) {

      var newDate = new Date(date);

      var month = parseInt(newDate.getMonth() + 1);

      //Lara 10Feb16: shorten the date
      var strMonth = month >9 ? month.toString(): '0'+month;
      //return months[month] + ' ' + newDate.getDate() + ', ' + newDate.getFullYear();
      return newDate.getDate() + '/' + strMonth + '/' + newDate.getFullYear();
    }

    //for reservation-controller.js to query
    function pad(n, width, z) {
      z = z || '0';
      n = n + '';
      return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }
    function formatHourMin(_t){
      //HH:mm
      t = new Date(_t);
      return  pad(t.getHours(),2) + ":" + pad(t.getMinutes(),2);
    }
    function formatDate(_d){
      //dd-mm-yyyy
      d= new Date(_d);
      return pad(d.getDate(), 2) + "-" + pad((d.getMonth() + 1), 2) + "-" + d.getFullYear();
    }
    function formatDate_YYYY(_d){
      //yyyy-mm-dd
      d= new Date(_d);
      return  d.getFullYear() + "-" + pad((d.getMonth() + 1), 2) + "-" + pad(d.getDate(), 2) ;
    }

    function tConvert (time) {
      // Check correct time format and split into components
      time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

      if (time.length > 1) { // If time format correct
        time = time.slice (1);  // Remove full string match value
        time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
        time[0] = +time[0] % 12 || 12; // Adjust hours
      }
      return time.join (''); // return adjusted time or original string
    }

    //for search-controller.js
    self.getAvailableRooms = function(_date, start, end, pax, floorID,
                                      siteID, scheduleID, equipmentID,
                                      repeat, endRepeatDate, isRecurrence){


      var def = $q.defer();
      var useDate = formatDate(_date);
      var encodedEndDate = '';

      if(repeat === 'Never') {
        encodedEndDate = btoa(useDate);
      } else {
        encodedEndDate = btoa(formatDate(endRepeatDate));
      }

      var encodedUid = btoa(CredentialService.getUid());
      var encodedFromDate = btoa(useDate);

      var encodedCapacity = btoa(pax);
      var encodedStartTime = btoa(formatHourMin(start));
      var encodedEndTime = btoa(formatHourMin(end));
      var encodedFloorID = btoa(floorID);
      var encodedEquipmentID = btoa(equipmentID);
      var encodedSiteID = btoa(siteID);
      var encodedRepeat = btoa(repeat);
      var encodedIsRecurrence = btoa(isRecurrence);

      //Saving scheduleID from reservedRoom
      self.setReservedScheduleID(scheduleID);

      ServerConfig.getUrl(ServerConfig.searchRoom).then(function(res){

        var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid +
          "&FromDate=" + encodedFromDate +
          "&EndDate=" + encodedEndDate +
          "&seatingcapacity=" + encodedCapacity +
          "&StartTime=" + encodedStartTime +
          "&EndTime=" + encodedEndTime +
          "&Floor=" + encodedFloorID +
          "&Site=" + encodedSiteID +
          "&Equipment=" + encodedEquipmentID +
          "&recurrencetype=" + encodedRepeat +
          "&isrecurrence=" + encodedIsRecurrence;

        console.log('Search url: ' + url);

        $http.jsonp(url)
          .success(function (data, status, headers, config) {
            var rooms = data;
            var lstRoom = [];

            angular.forEach(rooms, function(r){

              lstRoom.push
              (
                roomDetails(r.roomid, r.roomname,
                  r.sitename, r.siteid, r.seatingcapacity, null,
                  r.imagesrc, r.floorplan, r.floorname, r.xLocation, r.yLocation)
              );

            });
            def.resolve(lstRoom);
          })
          .error(function(errRes){
            def.reject(errRes);
          });
      });

      return def.promise;
    };

    //for reservation-controller.js to query
    self.manageMeeting = function(id, start, cancel, end){
      var def= $q.defer();
      var useUrl;
      if(cancel){
        useUrl = ServerConfig.getUrl(ServerConfig.cancelMeeting);
      }else if(start){
        useUrl = ServerConfig.getUrl(ServerConfig.startMeeting);
      }else if(end) {
        //end
        useUrl = ServerConfig.getUrl(ServerConfig.endMeeting);
      } else {
        useUrl = ServerConfig.getUrl(ServerConfig.extendMeeting);
      }

      var encodedUid = btoa(CredentialService.getUid());
      var encodedScheduleID = btoa(id);

      useUrl.then(function(res){
        var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid +
          "&scheduleid=" + encodedScheduleID;

        console.log('Manage meeting url: ' + url);

        $http.jsonp(url).
        success(function (data, status, headers, config) {
          def.resolve(data);
        }).
        error(function(data, status, headers, config){
          def.reject(errRes);
        });
      },function(errRes){
        def.reject(errRes);
      });

      return def.promise;
    };

    //for room-reservation confirmation slot time display
    self.formatSlotDisplay=function(slots, onNull){
      //if a to b, b to c, f to g -> should display a-> c, f->g
      var useSlot="";
      var isChecked=false;
      var b="";
      var assignedLast=false;
      //tabulate slots
      angular.forEach(slots,function(s) {
        //try and get stretches of time
        if(s.checked) {
          isChecked=true;
          if(b!="" && b==s.start) {
            //this.start == prev.end
            b=s.end;
          } else {
            //previous wasn't selected || this.start != prev.end;
            //this slot can't be linked, throw out b, create new slot
            useSlot +=b + "</li>";

            b=s.end;

            useSlot += "<li>" + s.start + " to ";

          }
          assignedLast=false;

        } else {
          //this slot can't be linked, throw out b, create new slot
          useSlot +=b + "</li>";
          assignedLast=true;
          b="";//reset b
        }
      });

      if(!assignedLast){
        useSlot +=b + "</li>";
      }

      if(!isChecked && onNull)
        useSlot= onNull; //useSlot= $scope.slot;

      //return
      return "Time Slot(s): <b>" + useSlot + "</b>";
    },

      // Reserving room
      self.reserveRoom = function(id, _date, start, end, name){
        var def=$q.defer();

        //var useDate = formatDate_YYYY(_date);
        var url = null;
        try
        {
          var encodedUid = btoa(CredentialService.getUid());
          var encodedStartDate = btoa(_date);
          var encodedEndDate = btoa(_date);
          var encodedStartTime = btoa(start);
          var encodedEndTime = btoa(end);
          var encodedSubject = btoa(name);
          var encodedRid = btoa(id);
        }catch(err){
          def.reject("Invalid characters not allowed");
        }

        ServerConfig.getUrl(ServerConfig.reserveRoom).then(function(res){

          if(self.getReservedScheduleID()) {
            var encodedScheduleID = btoa(self.getReservedScheduleID());

            url = res + "?callback=JSON_CALLBACK&UserId=" + encodedUid +
              "&StartDate=" + encodedStartDate +
              "&EndDate=" + encodedEndDate +
              "&StartTime=" + encodedStartTime +
              "&EndTime=" + encodedEndTime +
              "&subject=" + encodedSubject +
              "&RoomId=" + encodedRid +
              "&oid=" + encodedScheduleID;
          } else {
            url = res + "?callback=JSON_CALLBACK&UserId=" + encodedUid +
              "&StartDate=" + encodedStartDate +
              "&EndDate=" + encodedEndDate +
              "&StartTime=" + encodedStartTime +
              "&EndTime=" + encodedEndTime +
              "&subject=" + encodedSubject +
              "&RoomId=" + encodedRid;
          }

          console.log('Reserve room url: ' + url);

          $http.jsonp(url)
            .success(function (data, status, headers, config) {
              console.log('DATA', data);
              if (data.success === true)
              {
                self.setReservedScheduleID(null);
                def.resolve(data);
              }else{
                def.reject(JSON.stringify(data));
              }

            })
            .error(function(errRes, status, headers, config){
              def.reject(errRes);
            });
        },function(errRes){
          def.reject(errRes);
        });

        return def.promise;

      };

    self.updateSubject = function(id, _date, start, end, subject){
      var def = $q.defer();

      try
      {
        var encodedUid = btoa(CredentialService.getUid());
        var encodedSubject = btoa(subject);
        var encodedScheduleId = btoa(id);
      }catch(err){
        def.reject("Invalid characters not allowed");
      }

      ServerConfig.getUrl(ServerConfig.updateReservation).then(function(res){

        var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid +
          "&subject=" + encodedSubject +
          "&scheduleid=" + encodedScheduleId;

        console.log('Updating subject url: ' + url);

        $http.jsonp(url)
          .success(function (data, status, headers, config) {
            if (data.success === true)
            {
              def.resolve();
            }else{
              def.reject(JSON.stringify(data));
            }
          })
          .error(function(errRes, status, headers, config){
            def.reject(errRes);
          });
      });

      return def.promise;

    };

    //Helper Functions for Rooms
    self.getImageUrl=function(){
      return ServerConfig.getImageUrl();
    };
    self.getRoomCss=function(status){
      try{
        switch(angular.lowercase(status)){
          case self.starting:
            return 'status-yellow';
          case self.started:
            return 'status-red';
          case self.pending:
            return 'status-yellow';
          default:
            return 'status-green';
        }
      }
      catch(err){
        return 'status-yellow';
      }
    };
    self.getStatusCss=function(status){

      if(status && status.toLowerCase() === 'reserved') {
        status = 'starting';
      } else if (status && status.toLowerCase() === 'occupied') {
        status = 'started';
      } else if(status && status.toLowerCase() === 'pending admin approval') {
        status = 'pending';
      }

      if(status && angular.lowercase(status) == self.started){
        return "assertive";
      }
      else{
        return "balanced";
      }
    };
    self.isStarted=function(status){

      if(status && status.toLowerCase() === 'reserved') {
        status = 'starting';
      } else if (status && status.toLowerCase() === 'occupied') {
        status = 'started';
      } else if(status && status.toLowerCase() === 'pending admin approval') {
        status = 'pending';
      }

      if(angular.lowercase(status) == self.started){
        return true;
      }else{
        return false;
      }
    };

    self.decodeQrCode = function(roomID){
      var def= $q.defer();
      ServerConfig.getUrl(ServerConfig.qrCode).then(function(res){

          var encodedUid = btoa(CredentialService.getUid());
          var encodedRid = btoa(roomID);

          var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid + "&rid= " +
            encodedRid;

          console.log('QR url: ' + url);

          $http.jsonp(url)
            .success(function (data, status, headers, config) {
              def.resolve(data);
            })
            .error();
        }
        ,function(errRes){
          def.reject(errRes);
        });
      return def.promise;
    };


    self.getReservedScheduleID = function() {
      return self.reservedScheduleID;
    }

    self.setReservedScheduleID = function(scheduleID) {
      self.reservedScheduleID = scheduleID;
    }

    /** Nick */
    self.getRoomList = function() {
      return self.roomList;
    };

    self.setRoomList = function(roomList) {
      self.roomList = roomList;
    };

    self.getReservedRoomList = function() {
      return self.reservedRoomList;
    };

    self.setReservedRoomList = function(reservedRoomList) {
      self.reservedRoomList = reservedRoomList;
    };
  })
  .service('AppService',function($rootScope, $state, AppConfigService){
    var self= this;
    self.eventSuccess=function(type,data){
      doEvent(type,data);
    };
    //for tab-controller.js
    self.newSearch = function(){
      $rootScope.$broadcast('search.refresh');
    }
    $rootScope.$on('event.success',function(event, curr){
      doEvent(curr);

    });

    self.goHome=function(){
      AppConfigService.getPreferredLandingPageState().then(function(res){

        $state.go(res);
      },function(err){

      });
    };

    function doEvent(type, data){
      switch(type){
        case 'login':
          $state.go('tab.home');
          break;
        case 'logout':
          $state.go('login');
          break;
        case 'room-reserved':
          $state.go('tab.reservation');
          break;
        case 'qr-ack':
          $state.go("tab.reservation-detail",{param:data});
          break;
        case 'qr-book':
          $state.go("tab.home-roomschedule",{param:data});
          break;
        case 'mend':
        case 'mcancel':
          $state.go('tab.reservation');
          break;

      }
    }
  })
  //CredentialService holds username, password & IP.
  .service('CredentialService', function($rootScope, $http, $q, ServerConfig){
//this service handles all the credential storage, log in, log out
    var self = this;
    self.isInit=false;

    self.isLoggedIn = function(){

      var id= self.getUid();
      if(id == '' || id == null || id=='undefined'){
        return false;
      }else{
        return true;
      }
    };
    function resetCredentials(){
      localStorage.setItem("username", "");
      localStorage.setItem("name", "");
      localStorage.setItem("password", "");
      localStorage.username="";
      localStorage.name="";
      localStorage.password = "";
    }

    self.getDisplayName=function(){
      var ret = localStorage.getItem("name");
      if(ret =="" || ret == null){
        ret = localStorage.name;
      }
      return ret;
    };

    self.getUid=function(){
      var ret = localStorage.getItem("username");

      if(ret =="" || ret == null){
        ret = localStorage.username;
      }
      return ret;
    };

    self.getPassword = function() {
      var password = localStorage.getItem("password");

      if(password=="" || password==null) {
        password = localStorage.password;
      }

      return password;
    }

    //Lara 11Feb16: added - return http protocol based on boolean param
    self.getHttpProtocol=function(isHttps){
      return isHttps?"https" : "http";
    };

    //Lara 11Feb16: added - return boolean whether protocol is https
    //  self.isHttpsEnabled=function(){
    //    var isHttps=localStorage.getItem("isHttps");
    //
    //    if(isHttps=="" || isHttps==null){
    //      isHttps=localStorage.isHttps;
    //    }
    //
    //    return isHttps == 'https' ? true : false;
    //  };

    self.isHttpsEnabled = function() {

      if(!localStorage.getItem('isHttps')) {
        return true;
      } else {
        if(localStorage.getItem('isHttps') === 'https') {
          return true;
        } else {
          return false;
        }
      }
    };

    self.getIp=function(){
      var ret = localStorage.getItem("serverip");
      if(ret =="" || ret == null){
        ret = localStorage.serverip;
      }
      return ret;
    };
    //auth sets Uid/DisplayName
    self.auth=function(username,password,ip, isHTTPSEnabled){

      //Lara 10Feb16: this portion is redundant, every re-authentication, the user must specify protocol
      var  http = self.getHttpProtocol(isHTTPSEnabled);

      var def= $q.defer();

      // Server address appended by following path
      var _ip = http + '://' + ip + '/smartroommobiledata';

      ServerConfig.setIpAddr(_ip).then(function(res){//pass ip down to server config
        ServerConfig.getUrl(ServerConfig.login).then(function(res){

          try {
            var encodedUsername = btoa(username);
            var encodedPassword = btoa(password);
          }catch(err){
            def.reject({success:false});
          }
          var url = res + "?callback=JSON_CALLBACK&UserId=" + encodedUsername + "&Password=" + encodedPassword ;

          console.log('Login url: ' + url);

          $http.jsonp(url).
          success(function (data, status, headers, config) {
            if (data.success === true) {

              localStorage.setItem("username", username);
              localStorage.setItem("name", data.name);
              localStorage.setItem('password', password);
              localStorage.setItem('isHttps', http);
              localStorage.setItem("serverip", ip);
              localStorage.username = username;//? why set so many:some cannot work in IOS
              localStorage.name = data.name;//? why set so many:some cannot work in IOS
              localStorage.serverip = ip;//? why set so many:some cannot work in IOS
              localStorage.password = password;
              localStorage.isHttps = http;
              def.resolve({success:true, name:data.name});
            }
            else
            {
              def.reject({success:false});
            }
          }).
          error(function (data, status, headers, config) {
            //resetCredentials();

            def.reject({success:false, error: status, data:data});
          });
        },function(errRes){
          def.reject({success:false, error:JSON.stringify(errRes)});
        });

      },function(errRes){

        def.reject({success:false, error:JSON.stringify(errRes)});
      });

      return def.promise;
    };

    self.init = function(){
      ServerConfig.init(self.getIp());
      self.isInit=true;
    }

    self.logout = function(){
      resetCredentials();
    };

    //init on start
    if(!self.isInit)
      self.init();
  })
  .service('AppConfigService',function($http, $q, $rootScope, ServerConfig, CredentialService, $ionicPopup, MaskFac, $ionicHistory, $state){
    var self=this;
    //private, localstoragekeys
    var keys={
      keyFilterSite:"filterSite",
      keyFilterLevel:"filterLevel",
      keyLandingPage:"landingPage"
    };
    //my options
    self.filterOptions={};
    self.landingPageOptions=[];
    //my settings
    self.landingPage='';
    self.filter={
      site:"",
      level:""
    };

    self.floors = [];
    self.isInit=false;


    function requestFilterOptions() {
      var def= $q.defer();

      ServerConfig.getFloorUrl(ServerConfig.floor).then(function(res){
        MaskFac.loadingMask(true, 'Loading');

        var encodedUid = btoa(CredentialService.getUid());

        var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid;

        console.log('Floor url: ' + url);

        var siteSettingList = [];
        var floorSettingList = [];

        $http.jsonp(url).
        success(function (data, status, headers, config) {

          siteSettingList.push({displayName: "Any", value: ""});
          floorSettingList.push({displayName: "Any", value: "", floorID: ""});

          for(var index in data) {
            siteSettingList.push({displayName: data[index].SiteName, value: data[index].siteid});
            floorSettingList.push({displayName: data[index].name, value: data[index].name, floorID: data[index].id});
          }

          // Removing duplicate entry from list
          var siteArray = {};
          for ( var i=0, len= siteSettingList.length; i < len; i++ ) {
            siteArray[siteSettingList[i]['displayName']] = siteSettingList[i];
          }

          siteSettingList = [];
          for ( var key in siteArray ) {
            siteSettingList.push(siteArray[key]);
          }

          var floorArray = {};
          for ( var i=0, len= floorSettingList.length; i < len; i++ ) {
            floorArray[floorSettingList[i]['displayName']] = floorSettingList[i];
          }

          floorSettingList = [];
          for ( var key in floorArray ) {
            floorSettingList.push(floorArray[key]);
          }

          self.filterOptions = {
            site: siteSettingList,
            level: floorSettingList
          };

          MaskFac.loadingMask(false);

          def.resolve(self.filterOptions);
        }).
        error(function (data, status, headers, config) {
          MaskFac.loadingMask(false);

          def.reject({success:false, error: status, data:data});
        });
      });

      return def.promise;
    }

    function requestAllEquipments() {
      var def = $q.defer();

      var equipmentsList = [];

      ServerConfig.getEquipmentUrl(ServerConfig.equipment).then(function(res) {

        MaskFac.loadingMask(true, 'Loading');

        var encodedUid = btoa(CredentialService.getUid());

        var url = res + "?callback=JSON_CALLBACK&userid=" + encodedUid;

        console.log('Equipments url: ' + url);

        $http.jsonp(url).success(function (data, status, headers, config) {

          equipmentsList.push({displayName: "Any", value: "", equipmentID: ""});

          for(var index in data) {
            equipmentsList.push({displayName: data[index].name, value: data[index].name, equipmentID: data[index].id});
          }

          def.resolve(equipmentsList);

          MaskFac.loadingMask(false);
        }).error(function(data, status, headers, config) {

          MaskFac.loadingMask(false);

          def.reject({success:false, error: status, data:data});
        });
      });

      return def.promise;
    }


    function requestLandingPageOptions(){
      var def= $q.defer();
      ServerConfig.getLandingPageOption().then(function(res){
        self.landingPageOptions=res;
        def.resolve();
      },function(err){
        def.reject(err);
      });
      return def.promise;
    }


    function jsonSearch(arr,val){
      var ret=arr[0];
      if(val){
        angular.forEach(arr,function(op){
          if(op.value == val){
            ret = op;
          }
        });
      }
      return ret;
    }

    function retrieveFilters() {
      //fill defaults if setting not found
      var _site = retrieveSettings(keys.keyFilterSite);
      var _level = retrieveSettings(keys.keyFilterLevel);

      self.filter={
        site: jsonSearch(self.filterOptions.site, _site),
        level: jsonSearch(self.filterOptions.level, _level)
      };

    };

    function retrieveLandingPage(){
      //fill defaults if setting not found

      var _landing = retrieveSettings(keys.keyLandingPage);

      self.landingPage= jsonSearch(self.landingPageOptions, _landing);

    }

    function storeSettings(n,v){
      localStorage.setItem(n, v);
      localStorage[n]=v;
    }
    function retrieveSettings(n){
      var ret = localStorage.getItem(n);
      if(ret =="" || ret == null){
        ret = localStorage[n];
      }

      return ret;
    }

    this.prepareFilter = function() {

      var def= $q.defer();

      requestFilterOptions().then(function(){
        retrieveFilters();

        def.resolve();
      },function(errFilter){
        def.reject(errFilter);
      });

      return def.promise;
    };

    this.prepareEquipment = function() {

      var def = $q.defer();

      requestAllEquipments().then(function(equipmentsList){

        def.resolve(equipmentsList);
      },function(err){
        def.reject(err);
      });

      return def.promise;

    };

    function init(){
      var def= $q.defer();

      requestLandingPageOptions().then(function(){

        retrieveLandingPage();
        self.isInit=true;
        def.resolve();
      },function(errLanding){
        def.reject(errLanding);
      });

      return def.promise;
    }
    //for home.html
    self.isFilterCriteriaMet= function(siteId, levelId){
      if(self.filter.site.value || self.filter.level.value){
        if(self.filter.site.value && self.filter.level.value){
          if(siteId == self.filter.site.value && levelId==self.filter.level.value){
            return true;//has site & level filter
          }else{
            return false;
          }
        }
        else if(self.filter.site.value  && siteId == self.filter.site.value){
          return true;//has site filter only
        }else if(self.filter.level.value  && levelId == self.filter.level.value){
          return true;//has level filter only
        }

        return false;

      }else{

        return true;
      }
    };


    self.save=function(landing,site,level){
      storeSettings(keys.keyLandingPage, landing);
      storeSettings(keys.keyFilterSite, site);
      storeSettings(keys.keyFilterLevel, level);
      retrieveLandingPage();
      retrieveFilters();
    };

    self.getPreferredLandingPageState=function(){
      var def=$q.defer();
      if(self.landingPage){
        def.resolve(self.landingPage.value);

      }
      else{
        init().then(function(){
          def.resolve(self.landingPage.value);
        });
      }
      return def.promise;
    };

    //find out if any filter was set on the user side.
    self.hasFilter=function(def){
      if(!def){
        def =$q.defer();
      }
      if(!self.isInit){
        init().then(function(){

          self.hasFilter(def);
        });
      }else if((self.filter.site && self.filter.site.value) || (self.filter.level && self.filter.level.value)){
        def.resolve(true);
      }else{
        def.resolve(false);
      }
      return def.promise;
    };


    $rootScope.$on('deviceReady',function(){
      init();
    });
  });
