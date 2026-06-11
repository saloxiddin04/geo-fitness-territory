export function getLayers(): ({
    name: string;
    properties: ({
        name: any;
        doc: {
            default: any;
            minimum: any;
            maximum: any;
            units: any;
            description: any;
            requires: any[];
            disabledBy: any[];
            values: any;
        };
        mbx: {
            name: string;
            namespace: "layout" | "paint" | null;
            fullName: string;
        };
        type: any;
        value: any;
        image: boolean;
        translate: boolean;
        transition: any;
        expression: any;
        expressionSupported: boolean;
        support: any;
        allowedFunctionTypes: string[];
    } & {
        allowedFunctionTypes: never[];
    })[];
    props: {
        v10: any;
        v11?: undefined;
    };
    support: {
        v10: boolean;
        v11?: undefined;
    };
} | {
    name: string;
    properties: ({
        name: any;
        doc: {
            default: any;
            minimum: any;
            maximum: any;
            units: any;
            description: any;
            requires: any[];
            disabledBy: any[];
            values: any;
        };
        mbx: {
            name: string;
            namespace: "layout" | "paint" | null;
            fullName: string;
        };
        type: any;
        value: any;
        image: boolean;
        translate: boolean;
        transition: any;
        expression: any;
        expressionSupported: boolean;
        support: any;
        allowedFunctionTypes: string[];
    } & {
        allowedFunctionTypes: never[];
    })[];
    props: {
        v11: ({
            name: any;
            doc: {
                default: any;
                minimum: any;
                maximum: any;
                units: any;
                description: any;
                requires: any[];
                disabledBy: any[];
                values: any;
            };
            mbx: {
                name: string;
                namespace: "layout" | "paint" | null;
                fullName: string;
            };
            type: any;
            value: any;
            image: boolean;
            translate: boolean;
            transition: any;
            expression: any;
            expressionSupported: boolean;
            support: any;
            allowedFunctionTypes: string[];
        } & {
            allowedFunctionTypes: never[];
        })[];
        v10?: undefined;
    };
    support: {
        v11: boolean;
        v10?: undefined;
    };
})[];
export default function generateCodeWithEjs(layers: any): Promise<string[]>;
//# sourceMappingURL=generateCodeWithEjs.d.mts.map