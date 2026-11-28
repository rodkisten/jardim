import { EclipticGeoMoon } from 'astronomy-engine';
import type { ListeningEvent } from './insights';
import type { MoodEntry } from './mood-db';
import { moods } from './mood-db';
const signs=['Áries','Touro','Gêmeos','Câncer','Leão','Virgem','Libra','Escorpião','Sagitário','Capricórnio','Aquário','Peixes'];
export function deriveContext(event:ListeningEvent,entries:readonly MoodEntry[],hemisphere:'north'|'south'|undefined,moodHours=3){
 const time=Date.parse(event.occurredAt);
 if(!Number.isFinite(time))return event.context;
 const context={...event.context};
 if(!context.moonSign){const lon=EclipticGeoMoon(new Date(time)).lon;context.moonSign=signs[Math.floor(((lon%360+360)%360)/30)];}
 const month=Number(event.localDate.slice(5,7));
 if(hemisphere&&month>=1&&month<=12&&!context.season){const north=['Inverno','Primavera','Verão','Outono'];const index=Math.floor((month%12)/3);context.season=north[(index+(hemisphere==='south'?2:0))%4];}
 if(!context.mood){let closest:MoodEntry|undefined;let delta=Infinity;for(const entry of entries){const distance=time-Date.parse(entry.createdAt);if(distance>=0&&distance<=moodHours*3600000&&distance<delta&&moods[entry.mood-1]){closest=entry;delta=distance;}}if(closest)context.mood=moods[closest.mood-1];}
 return context;
}
