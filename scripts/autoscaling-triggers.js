//@auth
//@req(envName, nodeGroup, upLimit, downLimit)
var SAME_NODES = "environment.maxsamenodescount",
    MAX_NODES = "environment.maxnodescount",
    nMaxSameNodes = 16;

var hasCollaboration = (parseInt('${fn.compareEngine(7.0)}', 10) >= 0),
    q = [];

if (hasCollaboration) {
    q = JSON.parse('${quota.data}');
    q = [ q[SAME_NODES], q[MAX_NODES] ];
} else {
    q = jelastic.billing.account.GetQuotas(MAX_NODES + ";" + SAME_NODES ).array || [];
}

nMaxSameNodes = Math.min(q[0].value, q[1].value);

for (var i = 0, n = q.length; i < n; i++) {
  name = q[i].quota.name;
  value = q[i].value;

  if (nMaxSameNodes >= value) {
    if (name == MAX_NODES) nMaxSameNodes = value ? value - 1 : 1;
      else if (name == SAME_NODES) nMaxSameNodes = value;
  }
}

if (nMaxSameNodes < upLimit) upLimit = nMaxSameNodes;
if (upLimit <= downLimit) return {result:0, warning: 'autoscaling triggers have not been added due to upLimit ['+upLimit+'] <= downLimit ['+downLimit+']'};

var types = [{
    resourceType: "MEM",
    scaleUpValue: 70,
    scaleUpLimit: upLimit,
    scaleUpLoadPeriod: 5,
    scaleDownValue: 40,
    scaleDownLimit: downLimit,
    scaleDownLoadPeriod: 5
}, {
    resourceType: "CPU",
    scaleUpValue: 70,
    scaleUpLimit: upLimit,
    scaleUpLoadPeriod: 5,
    scaleDownValue: 40,
    scaleDownLimit: downLimit,
    scaleDownLoadPeriod: 5
}];

var cleanOldTriggers = true;

if (cleanOldTriggers) {
    var actions = ['ADD_NODE', 'REMOVE_NODE'];
    for (var i = 0; i < actions.length; i++) {
        var array = jelastic.env.trigger.GetTriggers(envName, session, actions[i]).array;
        for (var j = 0; j < array.length; j++) {
            if (array[j].nodeGroup == nodeGroup) jelastic.env.trigger.DeleteTrigger(envName, session, array[j].id);
        }
    }
}

for (var i = 0; i < types.length; i++) {
    t = types[i];
    
    var scaleUpTriggerData = {
        name: "scale-up",
        isEnabled: true,
        nodeGroup: nodeGroup,
        period: t.scaleUpLoadPeriod,
        condition: {
            type: "GREATER",
            value: t.scaleUpValue,
            resourceType: t.resourceType,
            valueType: "PERCENTAGES"
        },
        actions: [{
            type: "ADD_NODE",
            customData: {
                limit: t.scaleUpLimit,
                count: 2,
                notify: true
            }
        }]
    };
    
    var scaleDownTriggerData = {
        isEnabled: true,
        name: "scale-down",
        nodeGroup: nodeGroup,
        period: t.scaleDownLoadPeriod,
        condition: {
            type: "LESS",
            value: t.scaleDownValue,
            resourceType: t.resourceType,
            valueType: "PERCENTAGES"
        },
        actions: [{
            type: "REMOVE_NODE",
            customData: {
                limit: t.scaleDownLimit,
                count: 2,
                notify: true
            }
        }]
    };
    
    if (hasCollaboration) {
        resp = jelastic.env.trigger.AddAutoScalingTrigger(envName, session, scaleUpTriggerData);
        if (resp.result != 0) return resp;
        resp = jelastic.env.trigger.AddAutoScalingTrigger(envName, session, scaleDownTriggerData);
        if (resp.result != 0) return resp;
    } else {
        resp = jelastic.env.trigger.AddTrigger(envName, session, scaleUpTriggerData);
        if (resp.result != 0) return resp;
        resp = jelastic.env.trigger.AddTrigger(envName, session, scaleDownTriggerData);
        if (resp.result != 0) return resp;
    }
}


return {
    result: 0
};
