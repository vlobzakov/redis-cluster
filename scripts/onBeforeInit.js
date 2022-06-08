  var perEnv = "environment.maxnodescount",
    perNodeGroup = "environment.maxsamenodescount",
    ipEnabled = "environment.externalip.enabled",
    ipMaxCount = "environment.externalip.maxcount",
    ipPerNode = "environment.externalip.maxcount.per.node",
    minnodescount = 6, markup = null;
    
  var hasCollaboration = (parseInt('${fn.compareEngine(7.0)}', 10) >= 0),
    q = [];
      
  if (hasCollaboration) {
  q = [
        { quota : { name: perEnv }, value: parseInt('${quota.environment.maxnodescount}', 10) },
        { quota : { name: perNodeGroup }, value: parseInt('${quota.environment.maxsamenodescount}', 10) },
        { quota : { name: ipEnabled }, value: parseInt('${quota.environment.externalip.enabled}', 10) },
        { quota : { name: ipMaxCount }, value: parseInt('${quota.environment.externalip.maxcount}', 10) },
        { quota : { name: ipPerNode }, value: parseInt('${quota.environment.externalip.maxcount.per.node}', 10) }
    ];
        group = { groupType: '${account.groupType}' };
    } else {
        q = jelastic.billing.account.GetQuotas(perEnv + ";" + perNodeGroup + ";" + ipEnabled + ";" + ipMaxCount + ";" + ipPerNode).array;
        group = jelastic.billing.account.GetAccount(appid, session);
  }
  
  var max = minnodescount;
  for (var i = 0; i < 2; i++){
      if ( q[i].value < minnodescount) {
          markup = "Quota limits: " + q[i].quota.name + " = " + q[i].value + ". Please upgrade your account or contact us to extend the possibilities.";
          break;
      } else if (max < q[i].value) {
          max = q[i].value;
            if (max % 2 != 0) {
                max = --max;
            }
      }
  }
  var resp = {result: 0, settings: {"fields":[{"type":"spinner","name":"nodesCount","caption":"Nodes count","min":6,"max":12,"increment":2},{"name":"autoscaling","type":"checkbox","caption":"Enable Horizontal Auto-Scaling"}]}};
  
  if (q[2].value != 0 && q[3].value > 5 && q[4].value > 0) {
      resp.settings.fields.push(
          {"name":"externalIpAddresses","type":"checkbox","caption":"Enable External IP Addresses for cluster nodes"}
      ); 
  };
  
  if (markup) {
      resp.settings.submitType = (group == "trial") ? "upgrade" : "support";
      resp.settings.fields.push(
          {"type": "displayfield", "cls": "warning", "height": 30, "hideLabel": true, "markup": markup},
          {"type": "compositefield","height": 0,"hideLabel": true,"width": 0,"items": [{"height": 0,"type": "string","required": true}]}
      ); 
  } 
  return resp;
