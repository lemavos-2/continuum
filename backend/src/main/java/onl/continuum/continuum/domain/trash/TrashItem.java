package onl.continuum.continuum.domain.trash;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import onl.continuum.continuum.domain.entity.Entity;
import onl.continuum.continuum.domain.note.Note;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** Snapshot of a deleted note or entity, restorable for {@link #RETENTION_DAYS} days. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "trash_items")
public class TrashItem {
    public static final int RETENTION_DAYS = 30;

    @Id
    private String id;
    @Indexed
    private String userId;
    private String vaultId;
    /** NOTE or ENTITY */
    private String kind;
    private String originalId;
    private String title;
    private String subtype;
    private Note note;
    private String noteContent;
    private Entity entity;
    @Indexed
    private Instant deletedAt;
}
