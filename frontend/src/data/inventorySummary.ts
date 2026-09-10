export type InventorySummary = {
  summary: Record<string,number>
  hospitals: {id:string;name:string;country:string;region:string;city:string;assets:number;evidence:number;visits:number;observations:number;stale:number;opportunities:number;conflicts:number;needsReview:number;modalities:Record<string,number>}[]
  geography: Record<'country'|'region'|'city',{label:string;hospitals:number;assets:number;evidence:number;stale:number;opportunities:number;conflicts:number}[]>
  byModality: {label:string;assets:number}[];byReliability:{label:string;assets:number}[];byFreshness:{label:string;assets:number}[];byAge:{label:string;assets:number}[]
}
