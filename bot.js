'use strict';


const { token } = require('./auth.json'), Discord = require('discord.js'), client = new Discord.Client();
const guideMsg = ' If you\'d like to learn about me, please refer to the following guide: ' +
                'https://docs.google.com/document/d/1TXnkNdJlWq2y5ThYq02iM73o1AuduUnh_QhXZ3gUcj0/edit?usp=sharing.';


var channels = [], processing = false;


function processBuzz(msg, author, chan, chanData) {
 if(processing) {
   setTimeout(processBuzz, 1, msg, author, chan, chanData);
 }
 else {
   processing = true;
   var buzzes = chanData.buzzList;
   const TS = buzzes.length ? msg.createdTimestamp - chanData.firstBuzzTS : 0;


   for(var i = 0; i < buzzes.length + 1; i++) {
     if(i === buzzes.length || TS < buzzes[i].TS) {
       var buzzPromise;


       if(i === 0) {
         buzzes.map(buzz => buzz.TS -= TS);
         chanData.firstBuzzTS = msg.createdTimestamp;
         buzzPromise = chan.send(`1. ${author} has buzzed`);
       }
       else {
         buzzPromise = chan.send(`${i + 1}. ${author} has buzzed (+${TS / 1000} s)`);
       }


       buzzPromise.then(message => {
         buzzes.splice(i, 0, {player : author, TS : TS, buzzMsg : message});


         if(i === buzzes.length - 1) processing = false;


         for(var j = i + 1; j < buzzes.length; j++) {
           buzzes[j].buzzMsg.delete();
           var k = j;


           chan.send(`${j + 1}. ${buzzes[j].player} has buzzed (+${buzzes[j].TS / 1000} s)`)
               .then(message => {
                 buzzes[k].buzzMsg = message;
                 processing = false;
               });
         }
       });


       break;
     }
   }
 }
}


client.login(token).then(() => client.user.setActivity('certamen', { type: 'PLAYING'}));


client.on('message', msg => {
 const author = msg.author;


 if(!msg.guild && author !== client.user) {
   msg.reply(`Sorry, sliding into my DMs is not allowed (unfortunately).${guideMsg}`);
 }
 else {
   const chan = msg.channel;
   var chanData = channels.find(ch => ch.id === chan.id);


   if(!chanData) {
     chanData = {id : chan.id, scores : [0, 0, 0], buzzList : []};
     channels.push(chanData);
   }


   const cmd = msg.content.toLowerCase(), mod = chanData.moderator;
  
   switch(cmd) {
     case 'commands':
       msg.delete();
       chan.send(`Salvē, ${author}! Here is a list of commands you can give me.\n` +
                 '`commands`: you are here\n`guide`: links to guide\n`mod`: sets moderator\n' +
                 '`c`: clears buzzes\n`buzz`: buzzes\n`r`: recognizes buzzes\n' +
                 '`a753`: adds 753 points to Team A\'s score\n`b-509`: subtracts 509 points from Team B\'s score\n' +
                 '`c=476`: sets Team C\'s score to 476\n`scores`: updates scores');
       break;
    
     case 'guide':
       msg.delete();
       chan.send(`Salvē, ${author}!` + guideMsg);
       break;
    
     case 'mod':
       msg.delete();
       chanData.moderator = msg.member;
       msg.reply('you are now the moderator.');
       break;
    
     case 'c':
       msg.delete();
       chan.send(`${mod && mod.user === author ? 'The moderator' : author}` +
                 ' has cleared the buzzes.\n**__' + '\\_'.repeat(100) + '__**');
       chanData.buzzList = [];
       break;
    
     case 'buzz':
       msg.delete();
       if(mod && mod.voice.channelID) mod.voice.setMute(true);
       processBuzz(msg, author, chan, chanData);
       break;
    
     case 'r':
       msg.delete();
       if(mod && mod.voice.channelID) mod.voice.setMute(false);
       chan.send(`${mod && mod.user === author ? 'The moderator' : author}` +
                 ' has recognized the buzzes.');
       break;
    
     case 'scores':
       msg.delete();
       const sc = chanData.scores;
       chan.send(`${mod && mod.user === author ? 'The moderator' : author}` +
                 ` has issued a score update.\nTeam A: ${sc[0]}\nTeam B: ${sc[1]}\nTeam C: ${sc[2]}`);
       break;
    
     default:
       const teamLetter = cmd.charAt(0).toUpperCase();


       if(['a=', 'b=', 'c='].includes(cmd.substring(0, 2))) {
         const points = parseFloat(cmd.substring(2));


         if(!isNaN(points)) {
           msg.delete();
           chanData.scores[cmd.charCodeAt(0) - 97] = points;
           chan.send(`${mod && mod.user === author ? 'The moderator' : author}` +
                     ` has set Team ${teamLetter}'s score to ${points}.`);
         }
       }
       else if(['A', 'B', 'C'].includes(teamLetter)) {
         const points = parseFloat(cmd.substring(1));


         if(!isNaN(points)) {
           msg.delete();
           chanData.scores[cmd.charCodeAt(0) - 97] += points;


           if(cmd.charAt(1) === '-') {
             chan.send(`${mod && mod.user === author ? 'The moderator' : author}` +
                       ` has subtracted ${-points} points from Team ${teamLetter}'s score.`);
           }
           else {
             chan.send(`${mod && mod.user === author ? 'The moderator' : author}` +
                       ` has added ${points} points to Team ${teamLetter}'s score.`);
           }
         }
       }
   }
 }
});
