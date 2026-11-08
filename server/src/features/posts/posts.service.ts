//src/features/posts/posts.service.ts
import { pool } from "../../db/psql.js";
import type { CreatePostDTO } from "./posts.types.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const postsService = {
  async getPost(identifier: string) {
    try {
      const isUuid = UUID_REGEX.test(identifier);
      const whereCondition = isUuid ? "p.id = $1::uuid" : "p.slug = $1";
      const sql = `
        SELECT
          p.id,
          p.slug,
          p.category,
          p.subcategory,
          p.is_published,
          p.featured,
          p.thumbnail,
          p.post_images,
          p.title,
          p.short_description,
          p.main_content,
          p.tags,
          p.external_link,
          p.github_link,
          p.created_at,
          p.updated_at,
          u.display_name AS author_name,
          u.profile_title AS author_title,
          u.avatar_url AS author_avatar
        FROM posts p
        CROSS JOIN profile u
        WHERE ${whereCondition}
        LIMIT 1;
      `;
      return await pool.query(sql, [identifier]);
    } catch (err) {
      console.error("[posts.service.getPost] Database query failed", err);
      throw err;
    }
  },

  async createPost(data: CreatePostDTO & { slug: string }) {
    try {
      const sql = `
        WITH inserted AS (
          INSERT INTO posts (
            slug,
            category,
            subcategory,
            is_published,
            featured,
            thumbnail,
            post_images,
            title,
            short_description,
            main_content,
            tags,
            external_link,
            github_link
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        )
        SELECT
          i.id,
          i.slug,
          i.category,
          i.subcategory,
          i.is_published,
          i.featured,
          i.thumbnail,
          i.post_images,
          i.title,
          i.short_description,
          i.main_content,
          i.tags,
          i.external_link,
          i.github_link,
          i.created_at,
          i.updated_at,
          u.display_name AS author_name,
          u.profile_title AS author_title,
          u.avatar_url AS author_avatar
        FROM inserted i
        CROSS JOIN profile u;
      `;
      const values = [
        data.slug,
        data.category,
        data.subcategory || null,
        data.is_published !== undefined ? data.is_published : true,
        data.featured !== undefined ? data.featured : false,
        data.thumbnail,
        data.post_images,
        data.title,
        data.short_description,
        data.main_content,
        data.tags,
        data.external_link || null,
        data.github_link || null,
      ];

      return await pool.query(sql, values);
    } catch (err) {
      console.error("[posts.service.createPost] Database insert failed", err);
      throw err;
    }
  },

  async updatePost(setClause: string, params: any[]) {
    try {
      const sql = `
        WITH updated AS (
          UPDATE posts
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${params.length}
          RETURNING *
        )
        SELECT
          up.id,
          up.slug,
          up.category,
          up.subcategory,
          up.is_published,
          up.featured,
          up.thumbnail,
          up.post_images,
          up.title,
          up.short_description,
          up.main_content,
          up.tags,
          up.external_link,
          up.github_link,
          up.created_at,
          up.updated_at,
          u.display_name AS author_name,
          u.profile_title AS author_title,
          u.avatar_url AS author_avatar
        FROM updated up
        CROSS JOIN profile u;
      `;
      return await pool.query(sql, params);
    } catch (err) {
      console.error("[posts.service.updatePost] Database update failed", err);
      throw err;
    }
  },

  async deletePost(postId: string) {
    try {
      return await pool.query("DELETE FROM posts WHERE id = $1 RETURNING id;", [
        postId,
      ]);
    } catch (err) {
      console.error("[posts.service.deletePost] Database delete failed", err);
      throw err;
    }
  },

  async getFilteredPosts(
    page: number = 1,
    limit: number = 12,
    searchQuery: string | null = null,
    category: string | null = null,
    subcategory: string | null = null,
    tagsArray: string[] | null = null,
    featuredOnly: boolean = false,
    includeDrafts: boolean = false,
    sortBy: string = "date",
    sortOrder: string = "DESC",
  ) {
    const offset = (page - 1) * limit;
    const hasSearchQuery = !!(searchQuery && searchQuery.trim() !== "");

    const whereClauses: string[] = [];
    const queryValues: any[] = [];
    let paramIndex = 1;

    if (!includeDrafts) {
      whereClauses.push(`p.is_published = true`);
    }

    if (featuredOnly) {
      whereClauses.push(`p.featured = true`);
    }

    if (hasSearchQuery) {
      whereClauses.push(
        `(p.search_vector @@ websearch_to_tsquery('english', $${paramIndex}) OR $${paramIndex} <% p.title)`,
      );
      queryValues.push((searchQuery as string).trim());
      paramIndex++;
    }

    if (category && category !== "all" && category.trim() !== "") {
      whereClauses.push(`p.category = $${paramIndex}`);
      queryValues.push(category.trim());
      paramIndex++;
    }

    if (subcategory && subcategory.trim() !== "") {
      whereClauses.push(`p.subcategory = $${paramIndex}`);
      queryValues.push(subcategory.trim());
      paramIndex++;
    }

    if (tagsArray && tagsArray.length > 0) {
      whereClauses.push(`p.tags && $${paramIndex}::text[]`);
      queryValues.push(tagsArray);
      paramIndex++;
    }

    let whereString = "";
    if (whereClauses.length > 0) {
      whereString = "WHERE " + whereClauses.join(" AND ");
    }

    let orderString = "ORDER BY p.created_at DESC";
    if (sortBy === "title") {
      if (sortOrder === "ASC") {
        orderString = "ORDER BY p.title ASC";
      } else {
        orderString = "ORDER BY p.title DESC";
      }
    } else {
      if (sortOrder === "ASC") {
        orderString = "ORDER BY p.created_at ASC";
      } else {
        orderString = "ORDER BY p.created_at DESC";
      }
    }

    const thumbnailSelectExpression = includeDrafts
      ? "p.thumbnail"
      : `CASE
          WHEN p.thumbnail LIKE '%cloudinary.com%/upload/%'
           AND p.thumbnail NOT LIKE '%/upload/f_auto,q_auto,w_600/%'
           THEN regexp_replace(p.thumbnail, '/upload/', '/upload/f_auto,q_auto,w_600/')
          ELSE p.thumbnail
        END AS thumbnail`;

    const dataSql = `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.short_description,
        ${thumbnailSelectExpression},
        p.tags,
        p.category,
        p.subcategory,
        p.featured,
        p.is_published,
        p.github_link,
        p.external_link,
        p.created_at,
        p.updated_at,
        u.display_name AS author_name,
        u.profile_title AS author_title,
        u.avatar_url AS author_avatar,
        COUNT(*) OVER() AS full_count
      FROM posts p
      CROSS JOIN profile u
      ${whereString}
      ${orderString}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const countSql = `
      SELECT COUNT(*) AS count
      FROM posts p
      ${whereString};
    `;

    const finalValues = [...queryValues, limit, offset];

    if (!hasSearchQuery) {
      try {
        const dataRes = await pool.query(dataSql, finalValues);
        let totalCount = 0;

        if (dataRes.rows.length > 0) {
          totalCount = parseInt(dataRes.rows[0].full_count || "0", 10);
        } else if (offset > 0) {
          const countRes = await pool.query(countSql, queryValues);
          totalCount = parseInt(countRes.rows[0]?.count || "0", 10);
        }

        const cleanedRows = dataRes.rows.map((row) => {
          const { full_count, ...rest } = row;
          return rest;
        });

        return {
          rows: cleanedRows,
          totalCount,
        };
      } catch (err) {
        console.error(
          "[posts.service.getFilteredPosts] Database query failed",
          err,
        );
        throw err;
      }
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN;");
      await client.query("SET LOCAL pg_trgm.word_similarity_threshold = 0.3;");

      const dataRes = await client.query(dataSql, finalValues);
      let totalCount = 0;

      if (dataRes.rows.length > 0) {
        totalCount = parseInt(dataRes.rows[0].full_count || "0", 10);
      } else if (offset > 0) {
        const countRes = await client.query(countSql, queryValues);
        totalCount = parseInt(countRes.rows[0]?.count || "0", 10);
      }

      await client.query("COMMIT;");

      const cleanedRows = dataRes.rows.map((row) => {
        const { full_count, ...rest } = row;
        return rest;
      });

      return {
        rows: cleanedRows,
        totalCount,
      };
    } catch (err) {
      try {
        await client.query("ROLLBACK;");
      } catch (rollbackErr) {
        console.error(
          "[posts.service.getFilteredPosts] Transaction rollback failed",
          rollbackErr,
        );
      }
      console.error(
        "[posts.service.getFilteredPosts] Search transaction failed",
        err,
      );
      throw err;
    } finally {
      client.release();
    }
  },

  async getAllUniqueTags(
    category: string | null = null,
    subcategory: string | null = null,
    includeDrafts: boolean = false,
  ) {
    try {
      const whereClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (!includeDrafts) {
        whereClauses.push(`is_published = true`);
      }

      const hasCat = !!(
        category &&
        category !== "all" &&
        category.trim() !== ""
      );
      const hasSub = !!(subcategory && subcategory.trim() !== "");

      if (hasCat) {
        whereClauses.push(`category = $${paramIndex}`);
        values.push((category as string).trim());
        paramIndex++;
      }

      if (hasCat && hasSub) {
        whereClauses.push(`subcategory = $${paramIndex}`);
        values.push((subcategory as string).trim());
        paramIndex++;
      }

      const whereString =
        whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

      const sql = `
        SELECT DISTINCT unnest(tags) AS tag
        FROM posts
        ${whereString}
        ORDER BY tag ASC;
      `;

      const result = await pool.query(sql, values);
      const tagsList: string[] = [];
      for (const row of result.rows) {
        tagsList.push(row.tag);
      }

      return tagsList;
    } catch (err) {
      console.error(
        "[posts.service.getAllUniqueTags] Database query failed",
        err,
      );
      throw err;
    }
  },
};
