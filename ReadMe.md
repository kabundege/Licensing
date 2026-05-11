# Bank Licensing & Compliance Portal (Design Document)

## Overview

This system manages a controlled multi-step licensing review process between three actors: **Applicant**, **Reviewer**, and **Approver**. It enforces clear role-based transitions, keeps a complete audit trail of every state change, and stores versioned application documents.

## 1. State Machine

![State Machine Thumbnail](./State_Machine.png)

- **Draft -> Submitted**: Applicant creates and submits an application.
- **Submitted -> Under Review**: Reviewer starts assessment.
- **Under Review -> Pending Clarification**: Reviewer requests more information.
- **Pending Clarification -> Under Review**: Applicant resubmits documents.
- **Under Review -> Final Review**: Reviewer is satisfied and escalates.
- **Final Review -> Approved / Rejected**: Approver makes final decision.

## 2. System Design

![System Design Thumbnail](./System_Design.png)

The platform separates **public edge** traffic from **internal** services and uses async auditing plus pooled PostgreSQL access.

**Clients and documents**

- **BNR Staff** and **Applicants** call the backend over **HTTPS (REST)** via the **API Gateway**.
- **Applicants** upload blobs directly to **Document S3**; staff and applicants download blobs from the same store.

**DMZ**

- **API Gateway** terminates and authorizes traffic, then forwards authorized requests to an **Application Load Balancer** that fronts the app tier (**elastic scaling** implied).

**Internal network**

- **Application Service** handles business logic: reads/writes relational data through **PG-pool**, and uses **Applications Cache** for hot reads or session-shaped data.
- State transitions enqueue **append-only** audit work to an **Audit Queue**; an **Audit Service** consumes the queue and persists audit rows through **PG-pool**, matching the immutable audit requirement without blocking the main request path.

**Data tier**

- **PG-pool** fronts a **PostgreSQL cluster**: a **master** for writes and **replicas** for reads, supporting separation of read/write load while keeping a single source of truth for applications, users, roles, and audit metadata references.

## 3. Data Model (ERD)

![ERD Thumbnail](./ERD.png)

- `applications`: root entity (`applicant_id`, `reviewer_id`, `approver_id`, `status`, `version`, timestamps).
- `documents`: linked to applications; supports document versioning (`version`, `is_current`, `uploader_id`).
- `audit_logs`: immutable transition history (`actor_id`, `action`, `state_before`, `state_after`, `timestamp`).
- `users`: identity store for all actors; linked to roles.
- `roles`: role definitions (Applicant/Reviewer/Approver).
- `Permissions`: Permission Definition (CRUD) to designated resources

## 4. Roles & Permissions

To satisfy the requirement for distinct permission boundaries, the system uses Role-Based Access Control (RBAC) linked to specific resource permissions.

| Role      | Resource       | Permission / Action                 | Business Justification                                                                     |
| --------- | -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Applicant | `applications` | create, read_own, update_draft      | Applicants must manage their own lifecycle but are restricted from seeing competitor data. |
| Applicant | `documents`    | upload, read_own                    | Required for providing licensing evidence.                                                 |
| Reviewer  | `applications` | read_all, assign_self, request_info | Reviewers act as technical analysts to verify submission completeness.                     |
| Reviewer  | `audit_logs`   | read_all                            | Necessary for verifying the history of a specific application.                             |
| Approver  | `applications` | read_all, final_decision            | Executive role responsible for the legal granting of licenses.                             |

## 5. The Hard Decisions

### Document Handling & Scaling Strategy

- **Current Implementation**: The system implements a Local Filesystem Storage Provider. To protect the server's stability and disk space, a strict 5MB limit is enforced via server-side middleware before uploading.

- **Production Scaling (Future Improvement)**: Given more time and a production-ready environment, I would transition to a Direct-to-S3 Upload Strategy (From Client).
  - **The Logic**: Instead of the document passing through the application server, the client would request a `Presigned URL` from the Client's Sever Side. The client would then upload the document directly to an Amazon S3 bucket via an HTTPS PUT request.

  - **The Benefit**: This architecture prevents the application server from being overwhelmed by large file streams, offloading I/O heavy tasks to dedicated cloud storage.

  - **Data Integrity**: Upon a successful upload, the client would send the resulting S3 Object Key back to the API to be stored in the documents table, maintaining a reliable link between the application metadata and the physical file.
