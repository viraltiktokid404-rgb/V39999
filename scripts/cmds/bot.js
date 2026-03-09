const axios = require("axios");

const API = "https://api.noobs-api.rf.gd/dipto";

const prefixes = ["bby"," বেবি","bot","বট","botli","baby","babu","বাবু","bbu","বটলি","babe","হাই","hi","hlw","tarif","vodro","ovodro","fatima","liza"];

const reacts = ["❤️"," 🤑","🙈","🐣","🌸","💙","🖤","🤍","😍","😘","😎","🐸"," 🌀","🤬","❤️‍🩹","🐍","🥹","😇","😆","🥰","😂","🤖"];

const tarif = [
"এই নেও পটিয়ে দেখাও m.me/61552422054139 ",
"বলেন sir___😌",
"বলেন ম্যাডাম__😌",
"ওই মামা_আর ডাকিস না প্লিজ__😡🙂",
"I love you__😘😘",
"Bby না বলে Bow বলো___❤‍🩹😘",
"🍺 এই নাও জুস খাও..! Bby বলতে বলতে হাপায় গেছো না 🥲",
"Beshi dakle ammu boka diba to__🥺",
"আজকে আমার মন ভালো নেই__🙉",
"[███████]100%",
"ভুলে জাও আমাকে_____😞😞",
"কথা দেও আমাকে পটাবা...!! 😌",
"আমি অন্যের জিনিসের সাথে কথা বলি না__😏 ওকে",
"ভালো হয়ে যাও____😑😒",
"৩২ তারিখ আমার বিয়ে___🐤"
];
const rand = a => a[Math.floor(Math.random() * a.length)];

const cut = t => {
  t = (t || "").toLowerCase().trim();
  const p = prefixes.find(x => t.startsWith(x));
  return p ? t.slice(p.length).trim() : t;
};

async function ask(text, id) {
  try {
    const res = await axios.get(`${API}/baby`, {
      params: { text: text, senderID: id },
      timeout: 10000
    });

    return res?.data?.reply || rand(tarif);

  } catch {
    return rand(tarif);
  }
}

module.exports = {

config: {
  name: "bot",
  version: "2.0",
  author: "dipto • AHMED TARIF",
  role: 0,
  category: "Everyone"
},

onStart(){},

async onReply({api,event}){

  const text = cut(event.body) || "hi";

  const msg = await ask(text,event.senderID);

  api.setMessageReaction(rand(reacts), event.messageID,()=>{},true);

  api.sendMessage(msg,event.threadID,(e,i)=>{
    if(!e){
      global.GoatBot.onReply.set(i.messageID,{
        commandName:"bot",
        author:event.senderID
      });
    }
  },event.messageID);

},

async onChat({api,event}){

  if(!event.body || event.senderID==api.getCurrentUserID()) return;

  const low = event.body.toLowerCase();

  if(!prefixes.some(p=>low.startsWith(p))) return;

  const text = cut(low);

  api.setMessageReaction(rand(reacts), event.messageID,()=>{},true);

  const name = (await api.getUserInfo(event.senderID))[event.senderID].name;

  if(!text){

    const msg = rand(tarif);

    api.sendMessage({
      body:`〆 ${name} 〆\n\n• ${msg}`,
      mentions:[{
        tag:`• ${name}`,
        id:event.senderID
      }]
    },event.threadID,(e,i)=>{
      if(!e){
        global.GoatBot.onReply.set(i.messageID,{
          commandName:"bot",
          author:event.senderID
        });
      }
    },event.messageID);

  }

  else{

    const msg = await ask(text,event.senderID);

    api.sendMessage({
      body:`〆 ${name} 〆\n\n • ${msg}`,
      mentions:[{
        tag:`• ${name}`,
        id:event.senderID
      }]
    },event.threadID,(e,i)=>{
      if(!e){
        global.GoatBot.onReply.set(i.messageID,{
          commandName:"bot",
          author:event.senderID
        });
      }
    },event.messageID);

  }

}

};
