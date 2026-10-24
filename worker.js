const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Accept","Cache-Control":"no-store"};
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})}
export default {async fetch(request){
 const url=new URL(request.url);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(request.method!=="GET")return reply({error:"Method not allowed"},405);
 if(url.pathname==="/"||url.pathname==="/health")return reply({service:"DELRIO API",status:"online",routes:["/health","/prijspuls?q=product","/supermarket?q=product&country=NL|BE"]});
 const q=(url.searchParams.get("q")||"").trim();
 if(q.length<2||q.length>160)return reply({error:"Geef een zoekterm van 2 tot 160 tekens."},400);
 let upstream;
 if(url.pathname==="/prijspuls")upstream="https://prijspuls.nl/api/prijs?q="+encodeURIComponent(q);
 else if(url.pathname==="/supermarket"){
  const country=(url.searchParams.get("country")||"NL").toUpperCase();
  if(!["NL","BE"].includes(country))return reply({error:"PrijsProfeet ondersteunt hier alleen NL/BE."},400);
  const target=new URL(country==="BE"?"https://www.prijsprofeet.be/api/v1/search":"https://www.prijsprofeet.nl/api/v1/search");
  target.searchParams.set("q",q);target.searchParams.set("page_size","15");target.searchParams.set("page","1");upstream=target.toString();
 }else return reply({error:"Onbekende route"},404);
 try{
  const response=await fetch(upstream,{headers:{"Accept":"application/json","User-Agent":"DELRIO-Product-Search/1.0"},cf:{cacheTtl:60,cacheEverything:true}});
  const body=await response.text();
  if(!response.ok)return reply({error:"Upstream HTTP "+response.status,source:url.pathname,details:body.slice(0,400)},502);
  let data;try{data=JSON.parse(body)}catch{return reply({error:"Bron gaf geen geldige JSON terug",source:url.pathname,preview:body.slice(0,300)},502)}
  return reply({ok:true,source:url.pathname,data,checkedAt:new Date().toISOString()});
 }catch(e){return reply({error:"Bron niet bereikbaar",source:url.pathname,details:String(e?.message||e)},502)}
}};