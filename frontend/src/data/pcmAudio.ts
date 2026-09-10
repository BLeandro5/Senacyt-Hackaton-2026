// Pure local conversion from decoded microphone samples to 16 kHz mono WAV.
export function pcmWav(channels: Float32Array[], sourceRate: number): ArrayBuffer {
  if (!channels.length || !channels[0]?.length || sourceRate <= 0) throw new Error('Audio vacío.')
  const frames=Math.floor(channels[0].length*16000/sourceRate)
  if(frames>16000*180) throw new Error('El audio supera tres minutos.')
  const buffer=new ArrayBuffer(44+frames*2), view=new DataView(buffer)
  const word=(offset:number,text:string)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i))}
  word(0,'RIFF');view.setUint32(4,36+frames*2,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,frames*2,true)
  for(let i=0;i<frames;i++) {const pos=i*sourceRate/16000, lo=Math.floor(pos), fraction=pos-lo;let value=0;for(const channel of channels)value+=(channel[lo] || 0)*(1-fraction)+(channel[lo+1] ?? channel[lo] ?? 0)*fraction;value=Math.max(-1,Math.min(1,value/channels.length));view.setInt16(44+i*2,Math.round(value*(value<0?32768:32767)),true)}
  return buffer
}
