// ==UserScript==
// @name           atndpp
// @namespace      http://www.kugimiyabyou.net/
// @include        http://atnd.org/events/*
// @description    makoto takagi / oooooorz@gmail.com
// ==/UserScript==

/**
 * 最寄駅情報を取得する
 * @param lon 経度
 * @param lat 緯度
 * @param div htmlを追加するオブジェクト
 */

Date.prototype.toUTCArray= function(){
   var D= this;
   return [D.getUTCFullYear(), D.getUTCMonth(), D.getUTCDate(), D.getUTCHours(), D.getUTCMinutes(), D.getUTCSeconds()];
}

Date.prototype.toGcalFormat= function(){
   var tem, A= this.toUTCArray(), i= 0;
   A[1]+= 1;
   while(i++<7){
       tem= A[i];
       if(tem<10) A[i]= '0'+tem;
   }
   return A.splice(0, 3).join('')+'T'+A.join('')+'Z';
}

function getNearsideStation(lon,lat,div,link) {

    // 緯度経度から最寄り駅情報を取得
    var url = "http://map.simpleapi.net/stationapi?x=" + String(lon) + "&y=" + String(lat);
    var count = 0;
    GM_xmlhttpRequest({
            method:"GET",
                url:url,
                onload:function(res){

                var start = 0;
                var end = 0;
                var stations = "STATION:\n";

                console.log("get station info");
                while (true) {

                    start = res.responseText.indexOf("<station>",start);
                    end   = res.responseText.indexOf("</station>",start);

                    end = end + 10;
                    console.log(start);

                    // stationタグがみつから無かったら終了
                    if (start == -1) break;

                    count++;

                    // 駅情報を取得する
                    var station = res.responseText.substring(start,end);

                    var name = (station.match(/<name>([\w\W]+)<\/name>/i)||[])[1]||null;
                    var line = (station.match(/<line>([\w\W]+)<\/line>/i)||[])[1]||null;
                    var distance = (station.match(/<distanceM>([\w,]+)<\/distanceM>/i)||[])[1]||null;
                    var traveltime = (station.match(/<traveltime>([\W\w]+)<\/traveltime>/i)||[])[1]||null;
                    var stationInfo = line + "/" + name + "/" + distance + "/" + traveltime;

                    stations = stations + stationInfo + "\n";

                    var dl = document.createElement('dl');
                    dl.setAttribute('class',"heightLineParent");

                    var dt = document.createElement('dt');
                    dt.innerHTML = "最寄り駅 / ST:";

                    var dd = document.createElement('dd');
                    dd.innerHTML = stationInfo;
                    dl.appendChild(dt);
                    dl.appendChild(dd);
                    div.appendChild(dl);
                    start = end;

                }

                console.log(stations);
                console.log("station end");

            }
        });

}


/**
 * 緯度経度情報取得
 * @param event_id イベントiD
 * @param div 最寄り駅を追加するdivタグ
 * @return 緯度経度情報配列
 */
function getGeocode(event_id,div,link) {

    console.log("getGeocode");

    // ATND apiから各種情報を取得
    var url = "http://api.atnd.org/events/?event_id=" + String(event_id);

    console.log(url);
    GM_xmlhttpRequest({
            method:"GET",
                url: url,
                onload:function(res){

                // 緯度経度情報の取得
                lon = (res.responseText.match(/<lon\stype="decimal">(\d+\.\d+)<\/lon>/i)||[])[1]||null;
                lat = (res.responseText.match(/<lat\stype="decimal">(\d+\.\d+)<\/lat>/i)||[])[1]||null;

                if ((lon != null && lat != null)
                    &&(parseFloat(lon) != 0.0 && parseFloat(lat) != 0.0)) {
                    // 緯度経度情報が取得できた場合は最寄り駅を取得する
                    console.log("got geocode");
                    getNearsideStation(lon,lat,div,link);
                }
            }
        });

}

/**
 * メインスクリプト
 */
(function(){

    // TODO:最寄り駅をどうやって返すか？
    // TODO:コールバック関数は非同期で動いてる？
    var des = "";
    var location = "";
    var start = "";
    var end = "";

    var title_div = document.getElementById("main_title");
    var title = title_div.getElementsByTagName("h1")[0].innerHTML;
    var info_div = null;
    des = des + title + '\n' + title_div.getElementsByTagName("p")[0].innerHTML;
    //des = des + '\n' + title_div.getElementsByTagName("a")[0].href;
    //var eventId = (title_div.getElementsByTagName('a')[0].href.match(/http:\/\/atnd\.org\/events\/(\d+)/i)||[])[1]||null;
    var eventId = (document.URL.match(/http:\/\/atnd\.org\/events\/(\d+)/i)||[])[1]||null;

    var divs = document.getElementsByTagName('div');
    for (var i = 0; i < divs.length; i++) {

        var div = divs[i];
        console.log(div.className);

        if (div.className.indexOf("info_layout") != -1) {
            info_div = div;
            s = div.getElementsByTagName('abbr')[0].title;

            // See http://stackoverflow.com/questions/3566125/problem-with-date-formats-in-javascript-with-different-browsers
            // This hack is to make it work in all browsers.
            s = new Date(s.replace(/\-/g,'\/').replace(/\+09:00/, '').replace(/[T|Z]/g,' '));

            start = s.toGcalFormat();

            console.log("start =" + start);
            // 終了が設定されていないイベントもある
            if (div.getElementsByTagName('abbr').length == 2) {
                e = div.getElementsByTagName('abbr')[1].title;

                // See http://stackoverflow.com/questions/3566125/problem-with-date-formats-in-javascript-with-different-browsers
                // This hack is to make it work in all browsers.
                e = new Date(e.replace(/\-/g,'\/').replace(/\+09:00/, '').replace(/[T|Z]/g,' '));

                end = e.toGcalFormat();
            }
            else {
                // その場合googleカレンダーに起こられるので適当に設定
                end = start;
            }
            console.log("end =" + end);

            var dds = div.getElementsByTagName('dd');

            des = des + '\n' + "limit:" + dds[1].innerHTML; // 定員
            location = dds[2].getElementsByTagName('span')[0].innerHTML.replace(/[（）]/g,"");

            des = des + '\n' + "place:" + dds[2].innerHTML.replace(/<\/?span>/g,""); // 会場
            if (dds[3].getElementsByTagName('a').length != 0) {
                des = des + '\n' + "url  :" + dds[3].getElementsByTagName('a')[0].innerHTML; // URL
            }
            des = des + '\n' + "admin:" + dds[4].getElementsByTagName('a')[0].innerHTML; // 管理者
        }
    }

    

    console.log("created info");

    title = encodeURIComponent(title);
    location = encodeURIComponent(location);
    des = encodeURIComponent(des);
    console.log(des);

    // カレンダーリンクを生成
    var link = document.createElement('a');

    link.innerHTML = "<img src='http://www.google.com/calendar/images/ext/gc_button2.gif' border=0></a>";

    link.setAttribute('href',
//        'http://www.google.com/calendar/event?action=TEMPLATE&text=' + title
        'https://www.google.com/calendar/hosted/champierre.com/event?action=TEMPLATE&text=' + title
         + "&dates=" + start + "/" + end  + ""
        + "&details=" + des + "&location=" + location + "&trp=false&sprop=&sprop=name") ;

    title_div.appendChild(link);

    // 緯度経度情報の取得
    console.log(eventId);
    getGeocode(eventId,info_div,link);

})();
