export type MetaField={name:string;values?:string[]};
export type MetaLeadData={id:string;created_time?:string;field_data?:MetaField[];platform?:string;form_id?:string;page_id?:string};
export type MetaWebhookValue={leadgen_id?:string;form_id?:string;page_id?:string;created_time?:number;platform?:string;field_data?:MetaField[]};
export type MetaWebhookPayload={object?:string;entry?:Array<{id?:string;changes?:Array<{field?:string;value?:MetaWebhookValue}>}>};

