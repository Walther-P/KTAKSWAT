interface G6Item {id:string;label?:string;text?:string;type?:string;ownerName?:string}
interface G6Selection {id:string;label:string;board:boolean;editable:boolean}
interface G6Editor {
 readonly selected:G6Selection|null;readonly sharing:boolean;readonly locating:boolean;
 readonly sync:'failed'|'pending'|'saved';retry():void;
 list(board:boolean):G6Item[];select(id:string,board:boolean):void;
 transform(angle:number,scale:number):void;cancel():void;details():void;remove():void;stop():Promise<void>;
}
interface Window {
 __KTAK35_CORE:{roomUuid:string;userId:string};__KTAK6_EDITOR:G6Editor;
 __KTAK6:{version:string;closePanel:()=>void;openTools:(board:boolean,group:string)=>void;openObjectList:(board:boolean)=>void};
}
interface Document {modelContext?:{registerTool(tool:{name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown},options:{signal:AbortSignal}):void|Promise<void>}}
