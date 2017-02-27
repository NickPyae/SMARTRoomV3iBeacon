angular.module('app.directives', [])

.directive('fieldReq', function factory($window) {
  return {
    restrict   : 'A',
    replace    : true,
    transclude : true,
    template: '<span class="assertive" style="font-style:italic;">*Field Required</span>',
    link: function (scope, element, attrs) {
    }
  };
})
.directive('invalidChar', function factory($window) {
  return {
    restrict   : 'A',
    replace    : true,
    transclude : true,
    template: '<span class="assertive" style="font-style:italic;">*Invalid Character</span>',
    link: function (scope, element, attrs) {
    }
  };
})
.directive('roomCard',function() {
  return {
    templateUrl: "templates/room-template.html"
  };
})
.directive('bugFix',function(){
  return {
    replace:true,
    template:'<span>Attendees: {{meeting.count}}</span>'
  };
});
