package onl.continuum.continuum.infra.persistence;

import onl.continuum.continuum.domain.trash.TrashItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TrashItemRepository extends MongoRepository<TrashItem, String> {
    List<TrashItem> findByUserIdOrderByDeletedAtDesc(String userId);
    void deleteByUserIdAndDeletedAtBefore(String userId, Instant cutoff);
    void deleteByDeletedAtBefore(Instant cutoff);
    void deleteByUserId(String userId);
}
