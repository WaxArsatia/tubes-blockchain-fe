export const bpjsMedicalRecordsAbi = [
  {
    type: "function",
    name: "ADMIN_ROLE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "AUDITOR_ROLE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "FASKES_ROLE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "PASIEN_ROLE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "addDocuments",
    inputs: [
      {
        name: "recordId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "cids",
        type: "string[]",
        internalType: "string[]",
      },
      {
        name: "labels",
        type: "string[]",
        internalType: "string[]",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approveRecordAccess",
    inputs: [
      {
        name: "recordId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "requester",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMedicalRecord",
    inputs: [
      {
        name: "recordId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "viewRecord",
        type: "tuple",
        internalType: "struct BPJSMedicalRecords.MedicalRecordView",
        components: [
          {
            name: "id",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "patient",
            type: "address",
            internalType: "address",
          },
          {
            name: "faskes",
            type: "address",
            internalType: "address",
          },
          {
            name: "label",
            type: "string",
            internalType: "string",
          },
          {
            name: "fields",
            type: "tuple[]",
            internalType: "struct BPJSMedicalRecords.MedicalField[]",
            components: [
              {
                name: "label",
                type: "string",
                internalType: "string",
              },
              {
                name: "value",
                type: "string",
                internalType: "string",
              },
            ],
          },
          {
            name: "documents",
            type: "tuple[]",
            internalType: "struct BPJSMedicalRecords.Document[]",
            components: [
              {
                name: "cid",
                type: "string",
                internalType: "string",
              },
              {
                name: "label",
                type: "string",
                internalType: "string",
              },
              {
                name: "addedAt",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "addedBy",
                type: "address",
                internalType: "address",
              },
            ],
          },
          {
            name: "createdAt",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "submittedBy",
            type: "address",
            internalType: "address",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRecordAccessRequest",
    inputs: [
      {
        name: "recordId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "requester",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "viewRequest",
        type: "tuple",
        internalType: "struct BPJSMedicalRecords.AccessRequestView",
        components: [
          {
            name: "requester",
            type: "address",
            internalType: "address",
          },
          {
            name: "exists",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "patientApproved",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "faskesApproved",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "revoked",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "revokedBy",
            type: "address",
            internalType: "address",
          },
          {
            name: "requestedAt",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "updatedAt",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listAccessRequests",
    inputs: [],
    outputs: [
      {
        name: "requests",
        type: "tuple[]",
        internalType: "struct BPJSMedicalRecords.AccessRequestSummary[]",
        components: [
          {
            name: "recordId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "patient",
            type: "address",
            internalType: "address",
          },
          {
            name: "faskes",
            type: "address",
            internalType: "address",
          },
          {
            name: "recordLabel",
            type: "string",
            internalType: "string",
          },
          {
            name: "requester",
            type: "address",
            internalType: "address",
          },
          {
            name: "exists",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "patientApproved",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "faskesApproved",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "revoked",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "revokedBy",
            type: "address",
            internalType: "address",
          },
          {
            name: "requestedAt",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "updatedAt",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listMedicalRecords",
    inputs: [
      {
        name: "patient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "summaries",
        type: "tuple[]",
        internalType: "struct BPJSMedicalRecords.RecordSummary[]",
        components: [
          {
            name: "id",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "label",
            type: "string",
            internalType: "string",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listRecordAccessRequests",
    inputs: [
      {
        name: "recordId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "requests",
        type: "tuple[]",
        internalType: "struct BPJSMedicalRecords.AccessRequestSummary[]",
        components: [
          {
            name: "recordId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "patient",
            type: "address",
            internalType: "address",
          },
          {
            name: "faskes",
            type: "address",
            internalType: "address",
          },
          {
            name: "recordLabel",
            type: "string",
            internalType: "string",
          },
          {
            name: "requester",
            type: "address",
            internalType: "address",
          },
          {
            name: "exists",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "patientApproved",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "faskesApproved",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "revoked",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "revokedBy",
            type: "address",
            internalType: "address",
          },
          {
            name: "requestedAt",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "updatedAt",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listUsers",
    inputs: [],
    outputs: [
      {
        name: "users",
        type: "tuple[]",
        internalType: "struct BPJSMedicalRecords.UserView[]",
        components: [
          {
            name: "account",
            type: "address",
            internalType: "address",
          },
          {
            name: "identity",
            type: "string",
            internalType: "string",
          },
          {
            name: "isAdmin",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "isFaskes",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "isPasien",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "isAuditor",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "bpjsId",
            type: "string",
            internalType: "string",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registerBPJS",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
      {
        name: "bpjsId",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "registerUser",
    inputs: [
      {
        name: "identity",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "requestRecordAccess",
    inputs: [
      {
        name: "recordId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeRecordAccess",
    inputs: [
      {
        name: "recordId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "requester",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setAdmin",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
      {
        name: "active",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setAuditor",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
      {
        name: "active",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setFaskes",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
      {
        name: "active",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setPasien",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
      {
        name: "active",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitMedicalRecord",
    inputs: [
      {
        name: "patient",
        type: "address",
        internalType: "address",
      },
      {
        name: "faskes",
        type: "address",
        internalType: "address",
      },
      {
        name: "label",
        type: "string",
        internalType: "string",
      },
      {
        name: "fieldLabels",
        type: "string[]",
        internalType: "string[]",
      },
      {
        name: "fieldValues",
        type: "string[]",
        internalType: "string[]",
      },
    ],
    outputs: [
      {
        name: "recordId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyInsurance",
    inputs: [
      {
        name: "patient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "active",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "bpjsId",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "error",
    name: "AccessRequestMissing",
    inputs: [],
  },
  {
    type: "error",
    name: "AccessRequestRevoked",
    inputs: [],
  },
  {
    type: "error",
    name: "ArrayLengthMismatch",
    inputs: [],
  },
  {
    type: "error",
    name: "EmptyBPJSId",
    inputs: [],
  },
  {
    type: "error",
    name: "InactiveFaskes",
    inputs: [],
  },
  {
    type: "error",
    name: "InactivePatient",
    inputs: [],
  },
  {
    type: "error",
    name: "LastAdminRemovalNotAllowed",
    inputs: [],
  },
  {
    type: "error",
    name: "NotAdmin",
    inputs: [],
  },
  {
    type: "error",
    name: "NotAuthorizedForRecord",
    inputs: [],
  },
  {
    type: "error",
    name: "NotRecordParticipant",
    inputs: [],
  },
  {
    type: "error",
    name: "RecordNotFound",
    inputs: [],
  },
  {
    type: "error",
    name: "SelfRequestNotAllowed",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
] as const
