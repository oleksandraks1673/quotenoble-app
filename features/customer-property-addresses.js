/* Quote.Noble customer property addresses. Requires the existing authenticated Supabase client. */
export function propertyAddressService(supabase, userId) {
  if (!supabase || !userId) throw new Error('Authenticated Supabase session required');
  const table = () => supabase.from('customer_property_addresses');
  const verify = async (promise) => {
    const { data, error } = await promise;
    if (error) throw error;
    return data;
  };
  const key = (customerId) => {
    const value = String(customerId ?? '').trim();
    if (!value) throw new Error('Select a saved customer first');
    return value;
  };
  return {
    list(customerId) {
      return verify(table().select('*').eq('owner_id', userId)
        .eq('customer_key', key(customerId)).order('is_default', { ascending: false })
        .order('created_at', { ascending: true }));
    },
    async save(customerId, address) {
      const customer_key = key(customerId);
      const address_line1 = String(address.address_line1 ?? '').trim();
      if (!address_line1) throw new Error('Property address is required');
      const record = {
        owner_id: userId, customer_key,
        label: String(address.label || 'Property').trim(),
        address_line1, address_line2: String(address.address_line2 || ''),
        city: String(address.city || ''), province: String(address.province || ''),
        postal_code: String(address.postal_code || ''), country: String(address.country || 'Canada'),
        is_default: !!address.is_default, updated_at: new Date().toISOString()
      };
      if (address.id) {
        const rows = await verify(table().update(record).eq('id', address.id)
          .eq('owner_id', userId).eq('customer_key', customer_key).select());
        if (rows.length !== 1) throw new Error('Property update did not persist');
        return rows[0];
      }
      const rows = await verify(table().insert(record).select());
      if (rows.length !== 1) throw new Error('Property insert did not persist');
      return rows[0];
    },
    async remove(customerId, propertyId) {
      await verify(table().delete().eq('owner_id', userId)
        .eq('customer_key', key(customerId)).eq('id', propertyId));
    }
  };
}
/* Freeze an address snapshot on a quote/job/invoice so later property edits
   cannot silently rewrite an already-issued document. */
export function snapshotProperty(address) {
  if (!address) return null;
  const { id, label, address_line1, address_line2, city, province, postal_code, country } = address;
  return { property_id: id, label, address_line1, address_line2, city, province, postal_code, country };
}
