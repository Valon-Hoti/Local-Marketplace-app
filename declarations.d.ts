import React from 'react';

export class GiftedChat extends React.Component<any> {
    static append(currentMessages: any[], newMessages: any[], inverted?: boolean): any[];
}
export interface IMessage {
    _id: string | number;
    text: string;
    createdAt: Date | number;
    user: any;
    image?: string;
    video?: string;
    audio?: string;
    system?: boolean;
    sent?: boolean;
    received?: boolean;
    pending?: boolean;
    [key: string]: any;
}
export interface Reply {
    title: string;
    value: string;
    messageId?: any;
}
export const Actions: any;
export const Bubble: any;
export const SystemMessage: any;
export const Send: any;
export const InputToolbar: any;
export const Composer: any;
export const Day: any;
export const utils: any;
export const Avatar: any;
export const Message: any;
export const MessageText: any;
export const MessageImage: any;
export const Time: any;
export const LoadEarlier: any;
