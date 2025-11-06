package database

import "time"

type Message struct {
    ID        string    `json:"id"`
    Content   string    `json:"content"`
    ECitizenID int      `json:"ecitizenId"`
    Email     string    `json:"-"`
    FirstName string    `json:"-"`
    LastName  string    `json:"-"`
    StreamID  string    `json:"streamId"`
    Type      string    `json:"type"` // user, system, moderator
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
    DeletedAt *time.Time `json:"deletedAt,omitempty"`
}
