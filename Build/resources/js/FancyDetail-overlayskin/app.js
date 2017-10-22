var languagepack = 
{
};
var combatants = [];
var lastEncounter = null;
var lastEncounterRecord = [];
var onPlayRecord =false;
var onRecord = false;
var sortkey = "encdps";
var sorttype = "asc";
var lastCombat = null;
var websoket = null;
var mixeddps = null;
$(document).ready(function() 
{
	init();
	document.addEventListener('onOverlayDataUpdate', onOverlayDataUpdate);
	window.addEventListener('message', onMessage);
});

function onMessage(e) 
{
	if (e.data.type === 'onOverlayDataUpdate') 
		onOverlayDataUpdate(e.data);
}

// ACTWebSocket 적용
function connectWebSocket(uri)
{
	if(uri.indexOf("@HOST_PORT@") > -1) return;
	websocket = new WebSocket(uri);

	websocket.onmessage = function(evt) 
	{
		if (evt.data == ".") 
			websocket.send(".");
		else 
			document.dispatchEvent(new CustomEvent('onOverlayDataUpdate', { detail: JSON.parse(evt.data) }));
	};

	websocket.onclose = function(evt) 
	{ 
		setTimeout(function(){connectWebSocket(uri)}, 5000);
	};

	websocket.onerror = function(evt) 
	{
		websocket.close();
	};
}    
connectWebSocket(wsUri);

function getItem(id)
{
	if($(".content .item[data-id=\""+id+"\"]").length > 0)
		return $(".content .item[data-id=\""+id+"\"]");
	else
		return false;
}

function modifyItem(e)
{
	var item = getItem(e.name);
	
	if(e.avatar)
		$(item).find(".icon").css({"background-image":"url(./images/FancyDetail-overlayskin/icon/AVA.png)", "background-size":"20px auto", "background-position":"0px 3px"});

	$(item).attr("data-job", e.combatant.Job.toUpperCase());
	$(item).find(".datas>.values>.vv>span").remove();

	if($(item).find(".datas>.values>i").length == 0)
		$(item).find(".datas>.values").append("<i style=\"width:120px; overflow:hidden; word-break:none;\">"+e.name+"</i>");

	if($("#nicknamehide").attr("data-checked")=="true" && e.name != "YOU" && e.name != "Limit Break")
		$(item).find(".datas>.values>i").css("-webkit-filter","blur(3px)");
	else
		$(item).find(".datas>.values>i").css("-webkit-filter","");

	for(var i in sortObject[selectTab])
	{
		var text = i;
		if(sortObject[selectTab][i].display)
			$(item).find(".datas>.values>.vv").append("<span style=\"float:left; overflow:hidden; margin-left:3px; text-align:center; font-family:'Segoe UI';"+(sortObject[selectTab][i].width===undefined?" width:38px;":" width:"+sortObject[selectTab][i].width+"px;")+"\">"+e.combat[i]+"</div>");
	}

	var toprank = 0;
	var isallzero = true;

	var sortkeyD = sortkey;

	if(sortkeyD == "encdps")
		sortkeyD = "damage";
	else if(sortkeyD == "enchps")
		sortkeyD = "healed";

	for(var i in lastCombat)
	{
		if(sorttype=="asc")
		{
			toprank=lastCombat[i].combat;
			if(lastCombat[i].combat[sortkeyD] != 0) isallzero = false;
			break;
		}
		else
			toprank=lastCombat[i].combat;
	}

	var mixed = (e.combat[sortkeyD] / toprank[sortkeyD])*100;
	if(sortkeyD=="maxhit"||sortkeyD=="maxheal")
	{
		mixed = (e.combat[sortkeyD].split("-")[1] / toprank[sortkeyD].split("-")[1])*100;
	}

	if(toprank[sortkeyD] == 0 && isallzero)
		mixed = 100;

	if(mixed == 0)
		mixed = 1;

	$(item).css({"top":(e.rank*24), "z-index":(25-e.rank), "opacity":1});
	$(item).find(".bar").width(mixed+"%");
}

function encounterAct(e, n)
{
	if(e==null) return;
	var _a = e.detail.Encounter.title;
	var _b = parseFloat(e.detail.Encounter.encdps).toFixed(0);
	var _c = e.detail.Encounter.duration.replace(":","_");
	var combatant = [];
	var reg = /(.*?)\s\((.*?)\)/im;
	var idx=0;
	var avatars = 
	{
		"Rook Autoturret":"MCH",
		"Bishop Autoturret":"MCH",
		"Eos":"SCH",
		"Selene":"SCH",
		"Emerald Carbuncle":"SMN",
		"Topaz Carbuncle":"SMN",
		"Garuda-Egi":"SMN",
		"Titan-Egi":"SMN",
		"Ifrit-Egi":"SMN"
	}

	$("header .title").html(e.detail.Encounter.title=="Encounter"?"Parsing...":e.detail.Encounter.title);
	$("header .duration").html(e.detail.Encounter.duration);
	$("header .rdps").html(parseInt(e.detail.Encounter.encdps)+" RD");
	$("header .rhps").html(parseInt(e.detail.Encounter.enchps)+ " RH");
	$("header .rdamage").html(parseInt(e.detail.Encounter.damage)+" TD");
	$("header .rhealed").html(parseInt(e.detail.Encounter.healed)+ " TH");

	for(var user in e.detail.Combatant)
	{
		var c = e.detail.Combatant[user];
		combatant.push(
		{
			"dps":c.encdps, 
			"name":c.name,
			"rank":0,
			"combat": getCombatantDetail(c, e.detail.Encounter),
			"combatant":c,
			"avatar":false,
		});
	}
	
	lastEncounter = e;
	lastCombat = combatant;

	for(var user in combatant)
	{
		var find = false;
		var matches = combatant[user].name.match(reg);
		for(var i in combatants)
		{
			if(combatants[i]==combatant[user].name)
			{
				find = true;
			}
		}

		if(!find && combatant[user].combatant.Job != "" && combatant[user].name != "YOU")
		{
			combatants.push(combatant[user].name);
		}

		if(combatant[user].name == "Limit Break")
			combatant[user].combatant.Job = "LMB";
			
		try
		{
			var iscombat = false;
			if(reg.test(combatant[user].name))
			{
				isAvatar = true;
				for(var j in avatars)
				{
					if(j==matches[1])
					{
						isAvatar = true;
						break;
					}
				}
			}

			switch(matches[1])
			{
				case "Rook Autoturret": combatant[user].combatant.Job = "Mch"; combatant[user].avatar = true; break;
				case "Bishop Autoturret": combatant[user].combatant.Job = "Mch"; combatant[user].avatar = true; break;
				case "Eos": combatant[user].combatant.Job = "Sch"; combatant[user].avatar = true; break;
				case "Selene": combatant[user].combatant.Job = "Sch"; combatant[user].avatar = true; break;
				case "Emerald Carbuncle": combatant[user].combatant.Job = "Smn"; combatant[user].avatar = true; break;
				case "Topaz Carbuncle": combatant[user].combatant.Job = "Smn"; combatant[user].avatar = true; break;
				case "Garuda-Egi": combatant[user].combatant.Job = "Smn"; combatant[user].avatar = true; break;
				case "Titan-Egi": combatant[user].combatant.Job = "Smn"; combatant[user].avatar = true; break;
				case "Ifrit-Egi": combatant[user].combatant.Job = "Smn"; combatant[user].avatar = true; break;
			}

			for(var i in combatants)
			{
				if(combatants[i]==matches[2])
				{
					iscombat = true;
				}
			}

			if(iscombat && $("#mergeAvatar").attr("data-checked") == "true")
			{
				var finduser = -1;
				for(var i in combatant)
				{
					if(combatant[i].name == matches[2] || (combatant[i].name == "YOU" && myname.find(function(e){return e == matches[2]}) != null))
					{
						finduser = i;
					}
				}

				if(finduser>-1)
				{
					combatant[finduser].combat = mergeCombatantDetail(combatant[finduser].combat, combatant[user].combat, e);
					delete combatant[user];
				}
			}
		}
		catch(ex)
		{
			
		}
	}

	for(var n in combatant)
	{
		for(var u in combatant[n].combat)
		{
			if(u=="maxhit" || u=="maxheal") continue;
			combatant[n].combat[u] = convNumberFix(combatant[n].combat[u]);
		}
	}

	if(sortkey=="maxhit" || sortkey=="maxheal")
	{
		if(sorttype == "desc")
		{
			combatant.sort(function(b, a){return parseFloat(b.combat[sortkey].split("-")[1]) - parseFloat(a.combat[sortkey].split("-")[1])});
		}
		else
		{
			combatant.sort(function(a, b){return parseFloat(b.combat[sortkey].split("-")[1]) - parseFloat(a.combat[sortkey].split("-")[1])});
		}
	}
	else
	{
		if(sorttype == "desc")
		{
			combatant.sort(function(b, a){return parseFloat(b.combat[sortkey]) - parseFloat(a.combat[sortkey])});
		}
		else
		{
			combatant.sort(function(a, b){return parseFloat(b.combat[sortkey]) - parseFloat(a.combat[sortkey])});
		}
	}

	mixeddps = combatant;

	if($(".battlelog").find("div[data=\""+_a+"|"+_b+"|"+_c+"\"]").length == 0 && e.detail.Encounter.title != "Encounter")
	{
		$(".battlelog").prepend("<div select='no' data='"+_a+"|"+_b+"|"+_c+"' idx='"+(lastEncounterRecord+1)+"'>"+e.detail.Encounter.title+" ("+parseInt(e.detail.Encounter.encdps)+" RDPS)</div>");
		lastEncounterRecord.push(e);
		$(".battlelog div[data=\""+_a+"|"+_b+"|"+_c+"\"]").attr("select","yes");

		$(".battlelog div[data=\""+_a+"|"+_b+"|"+_c+"\"]").click(function(){
			if(lastEncounter.detail.Encounter.title != "Encounter")
			{
				encounterAct(e, false);
				$(".battlelog div").each(function(){$(this).attr("select", "no")});
				$(this).attr("select","yes");
				showBattleLog();
			}
		});
	}

	if($(".battlelog div").length > 20)
	{
		$(".battlelog div")[20].remove();
	}
		
	for(var user in combatant)
	{
		combatant[user].rank = idx++;
		addItem(combatant[user]);
	}

	$(".content .item").each(function()
	{
		var remove = true;
		for(var i in combatant)
		{
			if($(this).attr("data-id") == combatant[i].name) remove = false;
		}
	
		if(remove)
			$(this).remove();
	});
}

function mergeCombatantDetail(original, target, e)
{
	original.swings += parseInt(target.swings);
	original.dps = (parseFloat(original.dps) + parseFloat(target.dps)).toFixed(1);
	original.encdps = (parseFloat(original.encdps) + parseFloat(target.encdps)).toFixed(1);
	original.damage += parseInt(target.damage);
	original['damage%'] = (parseInt(original.damage) / parseInt(e.detail.Encounter.damage) * 100).toFixed(1);
	original.heals += parseInt(target.heals);
	original.enchps = (parseFloat(original.enchps) + parseFloat(target.enchps)).toFixed(1);
	original.healed += parseInt(target.healed);
	original['healed%'] = (parseInt(original.healed) / parseInt(e.detail.Encounter.healed) * 100).toFixed(1);
	original.misses += parseInt(target.misses);
	original.crithits += parseInt(target.crithits);
	original.critheals += parseInt(target.critheals);
	original['crithit%'] = (parseInt(original.crithits) / parseInt(original.swings) * 100).toFixed(1);
	original['critheal%'] = (parseInt(original.critheals) / parseInt(original.heals) * 100).toFixed(1);
	original.damagetaken += parseInt(target.damagetaken);
	original.healstaken += parseInt(target.healstaken);
	original.OverHealPct += parseInt(target.OverHealPct);
	original.kills += parseInt(target.kills);
	original.cures += parseInt(target.cures);
	
	original.ParryPct += target.ParryPct;
	original.BlockPct += target.BlockPct;

	return original;
}

function getCombatantDetail(c,e)
{
	return {
			"Job":c.Job,
			"swings":parseInt(c.swings),
			"dps":parseFloat(c.dps).toFixed(1),
			"encdps":parseFloat(c.encdps).toFixed(1),
			"damage":parseInt(c.damage),
			"damage%":(parseInt(c.damage) / parseInt(e.damage) * 100).toFixed(1),
			"DirectHitPct":parseInt(c.DirectHitPct),
			"CritDirectHitPct":parseInt(c.CritDirectHitPct),
			"heals":parseInt(c.heals),
			"enchps":parseFloat(c.enchps).toFixed(1),
			"healed":parseInt(c.healed),
			"healed%":(parseInt(c.healed) / parseInt(e.healed) * 100).toFixed(1),
			"misses":parseInt(c.misses),
			"crithits":parseInt(c.crithits),
			"critheals":parseInt(c.critheals),
			"crithit%":(parseInt(c.crithits) / parseInt(c.swings) * 100).toFixed(1),
			"critheal%":(parseInt(c.critheals) / parseInt(c.heals) * 100).toFixed(1),
			"damagetaken":parseInt(c.damagetaken),
			"healstaken":parseInt(c.healstaken),
			"OverHealPct":parseInt(c.OverHealPct),
			"kills":parseInt(c.kills),
			"deaths":c.deaths,
			"maxhit":getMaxhit(c),
			"maxheal":c.maxheal,
			"duration":c.duration,
			"ParryPct":removePerc(c.ParryPct),
			"BlockPct":removePerc(c.BlockPct),
			"powerdrain":c.powerdrain,
			"powerheal":c.powerheal,
			"cures":c.cures,
		};
}

function getMaxhit(c)
{
	var str = c.maxhit.replace(/\s\(\*\)/ig, "");

	var splitedtext = str.split("-");
	if(languagepack[splitedtext[0]] != undefined)
	{
		str = languagepack[splitedtext[0]]+"-"+splitedtext[1];
	}

	return str;
}

function removePerc(v)
{
	return parseInt(v.replace(/%/ig,""));
}

function isNumber(value) 
{
	return typeof isNaN(value) && isFinite(value);
}

function convNumberFix(val)
{
	if(isNumber(val))
		return val;
	else
		return 0;
}

function getMilliTick(time)
{
	return (time.getTime()*1000) + time.getMilliseconds();
}

function showBattleLog()
{
	if($(".battlelog").css("display") == "none")
	{
		$(".content").hide();
		$(".battlelog").show();
	}
	else
	{
		$(".content").show();
		$(".battlelog").hide();
	}
}

function windowmode() 
{
	var el = document
	, rfs = // for newer Webkit and Firefox
	el.exitFullScreen
	|| el.webkitExitFullscreen
	|| el.mozCancelFullScreen
	|| el.msExitFullScreen
	rfs.call(el);
}

function fullscreen() 
{
	var el = document.documentElement
	, rfs = // for newer Webkit and Firefox
	el.requestFullScreen
	|| el.webkitRequestFullScreen
	|| el.mozRequestFullScreen
	|| el.msRequestFullscreen
	;
	rfs.call(el);
}

function isFullscreen()
{
	return (document.fullscreen || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement);
}

function resort(obj)
{
	var tabs = "";
	var temp = "";
	var first = false;
	var sort = "";

	selectTab = $(obj).html();

	for(var i in sortObject)
	{
		tabs += "<div class=\"tab";
		if(i == selectTab)
		tabs += " seltab";
		tabs += "\" onclick=\"resort(this);\">"+i+"</div>";
	}

	for(var i in sortObject[selectTab])
	{
		if(!first)
		{
			sort = i;
			first = true;
		}

		if(sortObject[selectTab][i].display)
			temp += "<div data-sort=\"none\" data=\""+i+"\" "+(sortObject[selectTab][i].width===undefined?"":"style=\"width:"+sortObject[selectTab][i].width+"px;\"")+">"+sortObject[selectTab][i].label+"</div>";
	}

	$(".tabs").html(tabs);
	$(".datasort").html(temp);

	defaultSort = sortkey = sort;

	$(".datasort div[data=\""+defaultSort+"\"]").attr("data-sort","asc");
	encounterAct(lastEncounter, false);
	
	$(".datasort div").click(function(){
		sorttype="asc";
		if($(this).attr("data-sort") == "asc")
		{
			$(".datasort div").attr("data-sort","none");
			$(this).attr("data-sort","desc");
			sorttype="desc";
		}
		else if($(this).attr("data-sort") == "desc")
		{
			$(".datasort div").attr("data-sort","none");
			$(this).attr("data-sort","asc");
		}
		else
		{
			$(".datasort div").attr("data-sort","none");
			$(this).attr("data-sort","asc");
		}
		sortkey = $(this).attr("data");
		encounterAct(lastEncounter, false);
	});
}

function init()
{
	var version = "Beta 1.9";
	var temp = "";
	var tabs = "";
	for(var i in sortObject)
	{
		tabs += "<div class=\"tab";
		if(i == selectTab)
		tabs += " seltab";
		tabs += "\" onclick=\"resort(this);\">"+i+"</div>";
	}
	for(var i in sortObject[selectTab])
	{
		if(sortObject[selectTab][i].display)
			temp += "<div data-sort=\"none\" data=\""+i+"\" "+(sortObject[selectTab][i].width===undefined?"":"style=\"width:"+sortObject[selectTab][i].width+"px;\"")+">"+sortObject[selectTab][i].label+"</div>";
	}

	var html = "<div class=\"tooltip\"></div>"+
	"<header>"+
	"<div class=\"tabs\">"+
	tabs+
	"</div>"+
	"<div class=\"icon\" onmouseover=\"$('.tooltip').show(); $('.tooltip').css({'left':'0px', 'right':'auto', 'top':'45px'}); $('.tooltip').html('<div>History</div><div>Shows the last 20 parses.</div>');\" onmouseleave=\"$('.tooltip').hide();\" style=\"background:url(images/FancyDetail-overlayskin/img/calendar-text.png) no-repeat center center; background-size:90% auto; float:left;\" onclick=\"if($('.title').html().toString().indexOf('집계 중') == -1){showBattleLog();}\"></div>"+
	"<div class=\"duration\">00:00</div>"+
	"<div class=\"title\">---</div>"+
	"<div class=\"datacov\"><div class=\"rdps\">0 AvgDPS</div>"+
	"<div class=\"rhps\">0 AvgHPS</div>"+
	"<div class=\"rdamage\">0 Tot.Dmg</div>"+
	"<div class=\"rhealed\">0 Tot.Heal</div></div>"+
	"<div class=\"icons\">"+
	"<div class=\"icon\" onmouseover=\"$('.tooltip').show(); $('.tooltip').css({'left':'auto', 'right':'0px', 'top':'25px'}); $('.tooltip').html('<div>Refresh</div><div>Will refresh the Parse.</div>');\" onmouseleave=\"$('.tooltip').hide();\" style=\"background:url(images/FancyDetail-overlayskin/img/refresh.png) no-repeat center center; background-size:100% auto;\" onclick=\"location.href=location.href;\"></div>"+
	"<div class=\"icon\" onmouseover=\"$('.tooltip').show(); $('.tooltip').css({'right':'0px', 'left':'auto', 'top':'25px'}); $('.tooltip').html('<div>Merge Pet</div><div>Currently not Working on english client</div>');\" onmouseleave=\"$('.tooltip').hide();\" style=\"background:url(images/FancyDetail-overlayskin/img/account-multiple-plus.png) no-repeat center center; background-size:90% auto;\" data-checked=\"true\" id=\"mergeAvatar\"></div>"+
	"<div class=\"icon\" onmouseover=\"$('.tooltip').show(); $('.tooltip').css({'right':'0px', 'left':'auto', 'top':'25px'}); $('.tooltip').html('<div>Hide Names</div><div>Will blur out other Members name.</div>');\" onmouseleave=\"$('.tooltip').hide();\" style=\"background:url(images/FancyDetail-overlayskin/img/dns.png) no-repeat center center; background-size:90% auto;\" data-checked=\"true\" id=\"nicknamehide\"></div>"+
	"<div class=\"icon\" onmouseover=\"$('.tooltip').show(); $('.tooltip').css({'right':'0px', 'left':'auto', 'top':'25px'}); $('.tooltip').html('<div>125% Zoom</div><div>Will zoom the parse.</div>');\" onmouseleave=\"$('.tooltip').hide();\" style=\"background:url(images/FancyDetail-overlayskin/img/fullscreen.png) no-repeat center center; background-size:90% auto;\" data-checked=\"false\" id=\"magnify\" onclick=\"magnify();\"></div></div>";
	
	if(isFullscreen())
	{
		
	}
	else
	{

	}
	html +=
	"</header>"+
	"<div class=\"datasort\">"+
	temp+
	"</div>"+
	"<div class=\"content\">"+
	"<div class=\"item\" data-job=\"WAR\">"+
	"<div class=\"icon\"></div>"+
	"<div class=\"leftdeco\"></div>"+
	"<div class=\"datas\">"+
	"</div>"+
	"</div>"+
	"</div>"+
	"<div class=\"battlelog\" style=\"display:none;\">"+
	"</div><div class=\"versions\">"+version+"</div>";

	$("body").append(html);
	if (document.addEventListener) 
	{
		window.onbeforeunload = function() 
		{
			document.removeEventListener('onOverlayDataUpdate', onOverlayDataUpdate);
			window.removeEventListener('message', onMessage);
		};

		window.addEventListener("unload", function() 
		{
			document.removeEventListener('onOverlayDataUpdate', onOverlayDataUpdate);
			window.removeEventListener('message', onMessage);
		}, false);
	}

	for(var i in myname){combatants.push(myname[i]);}
	$(".datasort div[data=\""+defaultSort+"\"]").attr("data-sort","asc");

	$(".content *").remove();

	$("header .icon[data-checked]").click(function(){
		if($(this).attr("data-checked")=="true")
			$(this).attr("data-checked", "false");
		else
			$(this).attr("data-checked", "true");
		
		encounterAct(lastEncounter, false);
	});

	$(".datasort div").click(function(){
		sorttype="asc";
		if($(this).attr("data-sort") == "asc")
		{
			$(".datasort div").attr("data-sort","none");
			$(this).attr("data-sort","desc");
			sorttype="desc";
		}
		else if($(this).attr("data-sort") == "desc")
		{
			$(".datasort div").attr("data-sort","none");
			$(this).attr("data-sort","asc");
		}
		else
		{
			$(".datasort div").attr("data-sort","none");
			$(this).attr("data-sort","asc");
		}
		sortkey = $(this).attr("data");
		encounterAct(lastEncounter, false);
	});
}

function magnify()
{
	if($("#magnify").attr("data-checked") == "false")
		$("body").css({
						"transform":"scale(1.25)",
						"left":"11%",
						"right":"11%",
						"top":"11%",
						"bottom":"11%"});
	else
		$("body").css({
						"transform":"scale(1)",
						"left":"5px",
						"right":"5px",
						"top":"5px",
						"bottom":"5px"});
}

function addItem(e)
{
	if(!getItem(e.name))
		$(".content").append("<div class=\"item\" data-job=\""+e.combatant.Job.toUpperCase()+"\" data-id=\""+e.name+"\" style=\"top:"+((e.rank+2)*27)+"px; opacity:0;\"><div class=\"icon\"></div><div class=\"leftdeco d\"></div><div class=\"leftdeco\"></div><div class=\"datas\"><div class=\"values\"><div class=\"vv\"></div></div><div class=\"bar\"></div></div></div>");
	
	modifyItem(e);
}

function removeItem(id)
{
	$(".content .item[data-id=\""+id+"\"]").remove();
}

function onOverlayDataUpdate(e)
{
	encounterAct(e, false);
	$(".loading").fadeOut();
}