/*
  @name updateUserQuery
  @param update -> (
    email,
    updatedAt,
    inactive,
    lastSeenAt,
    preferredName,
    tier,
    picture,
    segmentId,
    isRemoved,
    reasonRemoved
  )
*/
UPDATE "User" SET
  email = COALESCE(:email, email),
  "updatedAt" = COALESCE(:updatedAt, "updatedAt"),
  inactive = COALESCE(:inactive, inactive),
  "lastSeenAt" = COALESCE(:lastSeenAt, "lastSeenAt"),
  "preferredName" = COALESCE(:preferredName, "preferredName"),
  tier = COALESCE(:tier, tier),
  picture = COALESCE(:picture, picture),
  "segmentId" = COALESCE(:segmentId, "segmentId"),
  "isRemoved" = COALESCE(:isRemoved, "isRemoved"),
  "reasonRemoved" = COALESCE(:reasonRemoved, "reasonRemoved")
WHERE id = :id;
